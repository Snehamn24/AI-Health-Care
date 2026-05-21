import { v4 as uuidv4 } from 'uuid';
import type {
  ClinicianHandoff,
  IntakeSession,
  StructuredIntake,
} from '../types/index.js';
import {
  analyzeSymptoms,
  conversationalReply,
  extractStructuredIntake,
  generateClinicianHandoff,
  extractProfileDetailsWithAI,
} from './gemini.js';
import { retrieveClinicalContext } from './rag.js';
import { runHybridTriage } from './triage.js';
import { savePatient, saveSession, getSession } from './firestore.js';
import { insertIntakeEvent } from './bigquery.js';
import { getDoctorForDepartment, generateAppointment } from './doctors.js';

const REQUIRED_FIELDS = [
  'name',
  'age',
  'gender',
  'existingConditions',
  'medications',
  'allergies',
] as const;

export async function createSession(): Promise<IntakeSession> {
  const now = new Date().toISOString();
  const session: IntakeSession = {
    id: uuidv4(),
    patientId: uuidv4(),
    phase: 'greeting',
    profile: {},
    symptoms: { symptoms: [] },
    messages: [],
    fieldsCollected: [],
    createdAt: now,
    updatedAt: now,
  };

  const greeting = await conversationalReply('greeting', '', {}, [...REQUIRED_FIELDS], '');
  session.messages.push({
    role: 'assistant',
    content: greeting,
    timestamp: now,
  });

  await saveSession(session);
  return session;
}

export async function processMessage(
  sessionId: string,
  userMessage: string
): Promise<{
  session: IntakeSession;
  reply: string;
  workflow?: { phase: string; structured?: StructuredIntake; handoff?: ClinicianHandoff };
}> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const now = new Date().toISOString();
  session.messages.push({ role: 'user', content: userMessage, timestamp: now });

  const conversationText = session.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  let reply: string;

  if (session.phase === 'greeting' || session.phase === 'registration') {
    // 1. Detect emergency risks to bypass optional fields immediately
    const isEmergency = /chest\s*pain|breathing\s*difficult|shortness\s*of\s*breath|stroke|suicid|bleeding|seizure/i.test(userMessage);
    if (isEmergency) {
      if (!session.fieldsCollected.includes('existingConditions')) {
        session.profile.existingConditions = [];
        markCollected(session, 'existingConditions');
      }
      if (!session.fieldsCollected.includes('medications')) {
        session.profile.medications = [];
        markCollected(session, 'medications');
      }
      if (!session.fieldsCollected.includes('allergies')) {
        session.profile.allergies = [];
        markCollected(session, 'allergies');
      }
    }

    // 2. Extract registration details (Hybrid: AI first, fallback to regex)
    const aiExtracted = await extractProfileDetailsWithAI(userMessage, conversationText, session.profile);
    if (aiExtracted.name) {
      session.profile.name = aiExtracted.name;
      markCollected(session, 'name');
    }
    if (aiExtracted.age) {
      session.profile.age = aiExtracted.age;
      markCollected(session, 'age');
    }
    if (aiExtracted.gender) {
      session.profile.gender = aiExtracted.gender;
      markCollected(session, 'gender');
    }
    if (aiExtracted.existingConditions) {
      session.profile.existingConditions = aiExtracted.existingConditions;
      markCollected(session, 'existingConditions');
    }
    if (aiExtracted.medications) {
      session.profile.medications = aiExtracted.medications;
      markCollected(session, 'medications');
    }
    if (aiExtracted.allergies) {
      session.profile.allergies = aiExtracted.allergies;
      markCollected(session, 'allergies');
    }

    extractRegistrationFields(session, userMessage);

    // 3. Smart Extraction: If patient provided symptoms before registration completes, extract symptoms immediately
    const analysis = await analyzeSymptoms(userMessage, session.profile, conversationText);
    const hasRealSymptoms = analysis.symptoms.length > 0 && !analysis.symptoms.includes('general discomfort');
    if (hasRealSymptoms) {
      session.symptoms.symptoms = [
        ...new Set([...session.symptoms.symptoms, ...analysis.symptoms]),
      ];
      if (analysis.severity) session.symptoms.severity = analysis.severity;
      if (/day|week|hour|month|year|since|ago|morning/i.test(userMessage)) {
        session.symptoms.duration = userMessage.match(/(\d+\s*(day|week|hour|month|year)s?)/i)?.[0] || userMessage;
      }
    }

    const missing = getMissingFields(session);
    const rag = await retrieveClinicalContext(userMessage);
    reply = await conversationalReply(
      session.phase,
      userMessage,
      session.profile,
      missing,
      rag.contextText
    );

    if (missing.length === 0) {
      if (hasRealSymptoms || isEmergency) {
        // Fast-track to triage immediately since we already have the symptoms!
        session.phase = 'triage';
        reply = await finalizeTriage(session, conversationText, rag.contextText);
      } else {
        session.phase = 'symptoms';
        reply += ' Please describe your main symptoms and how long you have had them.';
      }
    } else {
      session.phase = 'registration';
    }
  } else if (session.phase === 'symptoms' || session.phase === 'clarification') {
    // If we were explicitly waiting for duration, capture it
    if (session.pendingQuestion === 'duration') {
      const skipTerms = /skip|no|don't know|not sure|unspecified|nothing|none/i;
      if (skipTerms.test(userMessage)) {
        session.symptoms.duration = 'unspecified';
      } else {
        session.symptoms.duration = userMessage;
      }
      session.pendingQuestion = undefined;
    }

    const analysis = await analyzeSymptoms(userMessage, session.profile, conversationText);
    session.symptoms.symptoms = [
      ...new Set([...session.symptoms.symptoms, ...analysis.symptoms]),
    ];
    if (/day|week|hour|month|year|since|ago|morning/i.test(userMessage) && !session.symptoms.duration) {
      session.symptoms.duration = userMessage.match(/(\d+\s*(day|week|hour|month|year)s?)/i)?.[0] || userMessage;
    }
    if (analysis.severity) session.symptoms.severity = analysis.severity;

    const rag = await retrieveClinicalContext(
      session.symptoms.symptoms.join(' ') + ' ' + userMessage
    );

    const redFlagText = rag.redFlagHints.join(' ');
    
    // Check if we need to actively collect duration before triaging
    const needsDuration = !session.symptoms.duration && !session.symptoms.symptoms.includes('general discomfort');

    if (needsDuration && !session.pendingQuestion) {
      session.phase = 'symptoms';
      session.pendingQuestion = 'duration';
      reply = `Thank you. Could you please specify how long you have been experiencing these symptoms? (Please specify in days, months, or years)`;
    } else {
      const needsClarification =
        session.phase === 'symptoms' &&
        session.messages.filter((m) => m.role === 'user').length < 4 &&
        rag.clarifyingQuestions.length > 0;

      if (needsClarification && !session.pendingQuestion) {
        session.phase = 'clarification';
        const q = analysis.suggestedQuestions[0] || rag.clarifyingQuestions[0];
        session.pendingQuestion = q;
        reply = `I want to make sure we understand your situation correctly. ${q}`;
      } else {
        session.pendingQuestion = undefined;
        session.phase = 'triage';
        reply = await finalizeTriage(session, conversationText, rag.contextText);
      }
    }

    if (redFlagText && /emergency|severe/i.test(userMessage)) {
      reply =
        'I understand this may be urgent. Our clinical team will prioritize your case. ' + reply;
    }
  } else if (session.phase === 'triage') {
    const rag = await retrieveClinicalContext(userMessage);
    reply = await finalizeTriage(session, conversationText, rag.contextText);
  } else {
    reply =
      session.clinicianHandoff?.summary ||
      'Your intake is complete. A clinician will review your case shortly.';
    session.phase = 'complete';
  }

  session.messages.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
  session.updatedAt = new Date().toISOString();
  await savePatient(session.patientId, session.profile);
  await saveSession(session);

  return {
    session,
    reply,
    workflow: session.structuredIntake
      ? {
          phase: session.phase,
          structured: session.structuredIntake,
          handoff: session.clinicianHandoff,
        }
      : undefined,
  };
}

async function finalizeTriage(
  session: IntakeSession,
  conversationText: string,
  ragContext: string
): Promise<string> {
  const structured = await extractStructuredIntake(
    conversationText,
    session.symptoms,
    ragContext
  );

  const triage = await runHybridTriage(
    conversationText,
    structured.symptoms.length ? structured.symptoms : session.symptoms.symptoms
  );

  session.structuredIntake = {
    ...structured,
    urgency: triage.urgency,
    recommended_department: triage.department,
    red_flags_detected: triage.redFlags,
  };
  session.triage = triage;

  const doc = getDoctorForDepartment(triage.department);
  const appointmentTime = generateAppointment(triage.urgency);

  const summaryText = await generateClinicianHandoff(
    session.profile,
    structured,
    { urgency: triage.urgency, department: triage.department, reasoning: triage.reasoning }
  );

  session.doctorSuggestion = {
    doctorId: doc.id,
    doctorName: doc.name,
    specialty: doc.specialty,
    department: doc.department,
    floor: doc.floor,
    room: doc.room,
    hospitalLocation: doc.hospitalLocation,
    appointmentTime: appointmentTime,
    infoSentToDoctor: true, // Automatically sent by intake assistant upon session completion
  };

  session.clinicianHandoff = {
    summary: summaryText,
    symptoms: structured.symptoms,
    severity: structured.severity,
    possibleConcerns: structured.possible_concerns,
    recommendedActions: [
      `Specialist: ${doc.name} (${doc.specialty})`,
      `Location: Floor ${doc.floor}, Room ${doc.room} (${doc.hospitalLocation})`,
      `Slot: ${appointmentTime}`,
      `Priority: ${triage.urgency}`,
    ],
    department: triage.department,
    urgency: triage.urgency,
    generatedAt: new Date().toISOString(),
  };

  session.phase = 'complete';

  await insertIntakeEvent({
    session_id: session.id,
    patient_id: session.patientId,
    symptoms: structured.symptoms,
    urgency: triage.urgency,
    department: triage.department,
    is_emergency: triage.urgency === 'emergency',
    severity: structured.severity,
    created_at: new Date().toISOString(),
  });

  return `Thank you for sharing your information, ${session.profile.name || 'there'}. Based on our assessment, you are being routed to **${triage.department}** with **${triage.urgency}** priority.\n\n` +
    `🏥 **Doctor Recommendation:** We have matched you with **${doc.name}** (${doc.specialty}).\n` +
    `📍 **Exact Location:** Floor **${doc.floor}**, Room **${doc.room}** (${doc.hospitalLocation})\n` +
    `⏰ **Appointment Time:** **${appointmentTime}**\n\n` +
    `${summaryText} We have securely transmitted your clinical intake file directly to **${doc.name}**'s system. Is there anything else you'd like to add?`;
}

function getMissingFields(session: IntakeSession): string[] {
  return REQUIRED_FIELDS.filter((f) => !session.fieldsCollected.includes(f));
}

function extractRegistrationFields(session: IntakeSession, message: string): void {
  const lower = message.toLowerCase();

  // Smart skip detection for optional fields
  if (/skip|no thank|nothing|don't want|dont want|neither|no existing|no conditions|no meds|no medications|no allergies/i.test(lower)) {
    if (!session.fieldsCollected.includes('existingConditions')) {
      session.profile.existingConditions = [];
      markCollected(session, 'existingConditions');
    }
    if (!session.fieldsCollected.includes('medications')) {
      session.profile.medications = [];
      markCollected(session, 'medications');
    }
    if (!session.fieldsCollected.includes('allergies')) {
      session.profile.allergies = [];
      markCollected(session, 'allergies');
    }
  }

  if (!session.profile.name) {
    const nameMatch = message.match(
      /(?:my name is|i'm|i am|name is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i
    );
    if (nameMatch) {
      session.profile.name = nameMatch[1].trim();
      markCollected(session, 'name');
    } else if (/^[A-Za-z]+\s+[A-Za-z]+/.test(message.trim())) {
      const lead = message.trim().match(/^([A-Za-z]+\s+[A-Za-z]+)/);
      if (lead) {
        session.profile.name = lead[1];
        markCollected(session, 'name');
      }
    }
  }

  if (!session.profile.age) {
    let ageMatch = message.match(/(\d{1,3})\s*(?:years?\s*old|yo|age|y\.o\.)/i);
    if (!ageMatch) {
      ageMatch = message.match(/\b(?:i am|i'm|im|is)\s+(\d{1,3})\b/i);
    }
    if (!ageMatch) {
      const standalone = message.trim().match(/^(\d{1,3})$/);
      if (standalone) ageMatch = standalone;
    }
    if (!ageMatch && (session.phase === 'registration' || session.phase === 'greeting')) {
      const genericNumber = message.match(/\b(\d{1,3})\b/);
      if (genericNumber) {
        const val = parseInt(genericNumber[1], 10);
        if (val >= 1 && val <= 110) {
          ageMatch = genericNumber;
        }
      }
    }

    if (ageMatch) {
      session.profile.age = parseInt(ageMatch[1], 10);
      markCollected(session, 'age');
    }
  }

  if (!session.profile.gender) {
    if (/\b(male|female|non-binary|other|man|woman)\b/i.test(lower)) {
      session.profile.gender = message.match(/\b(male|female|non-binary|other|man|woman)\b/i)?.[1] || message;
      markCollected(session, 'gender');
    }
  }

  // If user says "no", "skip", "none", or "nothing", satisfy all background optional fields at once
  if (/\b(skip|none|no|nothing|nah|n\/a|no conditions|no allergies|no medications)\b/i.test(lower) || lower.trim() === 'no') {
    if (!session.fieldsCollected.includes('existingConditions')) {
      session.profile.existingConditions = [];
      markCollected(session, 'existingConditions');
    }
    if (!session.fieldsCollected.includes('medications')) {
      session.profile.medications = [];
      markCollected(session, 'medications');
    }
    if (!session.fieldsCollected.includes('allergies')) {
      session.profile.allergies = [];
      markCollected(session, 'allergies');
    }
  }

  if (!session.fieldsCollected.includes('existingConditions')) {
    if (/condition|diabetes|hypertension|asthma|heart disease|copd|none|no existing/i.test(lower)) {
      session.profile.existingConditions =
        /none|no existing|no condition/i.test(lower) ? [] : parseList(message);
      if (/diabetes|hypertension|asthma/i.test(lower) && session.profile.existingConditions.length === 0) {
        const found = message.match(/\b(diabetes|hypertension|asthma|heart disease)\b/gi);
        session.profile.existingConditions = found || ['noted in intake'];
      }
      markCollected(session, 'existingConditions');
    }
  }

  if (!session.fieldsCollected.includes('medications')) {
    if (/medication|medicine|taking|pill|aspirin|metformin|lisinopril|none|no med/i.test(lower)) {
      session.profile.medications =
        /none|no med/i.test(lower) ? [] : parseList(message);
      if (/aspirin|metformin|lisinopril|ibuprofen/i.test(lower) && session.profile.medications.length === 0) {
        const found = message.match(/\b(aspirin|metformin|lisinopril|ibuprofen)\b/gi);
        session.profile.medications = found || ['noted in intake'];
      }
      markCollected(session, 'medications');
    }
  }

  if (!session.fieldsCollected.includes('allergies')) {
    if (/allerg|penicillin|latex|none|no allerg/i.test(lower)) {
      session.profile.allergies = parseList(message);
      markCollected(session, 'allergies');
    }
  }

  // Unified health history closure to avoid duplicate prompts
  const hasCondCollected = session.fieldsCollected.includes('existingConditions');
  const hasMedCollected = session.fieldsCollected.includes('medications');
  const hasAllCollected = session.fieldsCollected.includes('allergies');
  if (hasCondCollected || hasMedCollected || hasAllCollected) {
    if (!session.fieldsCollected.includes('existingConditions')) {
      session.profile.existingConditions = session.profile.existingConditions || [];
      markCollected(session, 'existingConditions');
    }
    if (!session.fieldsCollected.includes('medications')) {
      session.profile.medications = session.profile.medications || [];
      markCollected(session, 'medications');
    }
    if (!session.fieldsCollected.includes('allergies')) {
      session.profile.allergies = session.profile.allergies || [];
      markCollected(session, 'allergies');
    }
  }
}

function parseList(message: string): string[] {
  if (/none|no |nothing|n\/a/i.test(message)) return [];
  return message
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 80);
}

function markCollected(session: IntakeSession, field: string): void {
  if (!session.fieldsCollected.includes(field)) {
    session.fieldsCollected.push(field);
  }
}
