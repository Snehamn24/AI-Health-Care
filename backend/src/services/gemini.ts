import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';
import { config } from '../config.js';
import type { Department, PatientProfile, SymptomData, UrgencyLevel } from '../types/index.js';

let genAI: GoogleGenerativeAI | null = null;
let vertexAI: VertexAI | null = null;

function getModel() {
  if (config.demoMode && !config.gemini.apiKey) {
    return null;
  }
  if (config.gemini.apiKey) {
    if (!genAI) genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    return genAI.getGenerativeModel({ model: config.gemini.model });
  }
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: config.gcp.projectId,
      location: config.gcp.location,
    });
  }
  return vertexAI.getGenerativeModel({ model: config.gemini.model });
}

export async function generateJSON<T>(
  prompt: string,
  fallback: T
): Promise<T> {
  const model = getModel();
  if (!model) return fallback;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text.trim()) as T;
  } catch {
    try {
      // secondary fallback try without generationConfig (in case older models don't support it)
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nRespond with valid JSON only.` }] }],
      });
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }
}

export async function generateText(prompt: string, fallback: string): Promise<string> {
  const model = getModel();
  if (!model) return fallback;

  try {
    const result = await model.generateContent(prompt);
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function analyzeSymptoms(
  message: string,
  profile: PatientProfile,
  history: string
): Promise<{
  symptoms: string[];
  severity: string;
  intent: string;
  medicalRelevance: string;
  suggestedQuestions: string[];
}> {
  const fallback = demoSymptomAnalysis(message);
  if (config.demoMode && !config.gemini.apiKey) return fallback;

  return generateJSON(
    `You are a clinical intake AI assistant. Analyze the patient message for symptoms.
Patient profile: ${JSON.stringify(profile)}
Conversation history: ${history}
Latest message: "${message}"

Return JSON:
{
  "symptoms": ["symptom1"],
  "severity": "low|medium|high",
  "intent": "brief intent",
  "medicalRelevance": "clinical note",
  "suggestedQuestions": ["follow-up question 1", "follow-up question 2"]
}`,
    fallback
  );
}

export async function extractStructuredIntake(
  conversation: string,
  symptoms: SymptomData,
  ragContext: string
): Promise<{
  symptoms: string[];
  duration: string;
  severity: string;
  recommended_department: Department;
  possible_concerns: string[];
}> {
  const fallback = demoStructuredIntake(symptoms);
  if (config.demoMode && !config.gemini.apiKey) return fallback;

  return generateJSON(
    `Extract structured medical intake from conversation.
RAG clinical context: ${ragContext}
Symptoms data: ${JSON.stringify(symptoms)}
Conversation: ${conversation}

Departments: General Medicine, Cardiology, Neurology, Orthopedics, Pulmonology, Dermatology, ENT, Psychiatry, Emergency Care

Return JSON:
{
  "symptoms": [],
  "duration": "",
  "severity": "low|medium|high",
  "recommended_department": "Department name",
  "possible_concerns": []
}`,
    fallback
  );
}

export async function llmTriageAssessment(
  symptoms: string[],
  conversation: string,
  redFlags: string[]
): Promise<{ urgency: UrgencyLevel; department: Department; reasoning: string; confidence: number }> {
  const fallback = demoTriageLLM(symptoms, redFlags);
  if (config.demoMode && !config.gemini.apiKey) return fallback;

  return generateJSON(
    `Clinical triage assessment. Prefer OVER-triage for safety.
Symptoms: ${symptoms.join(', ')}
Red flags already detected: ${redFlags.join(', ')}
Conversation: ${conversation}

Return JSON:
{
  "urgency": "emergency|urgent|high|medium|low",
  "department": "one of the standard departments",
  "reasoning": "2-3 sentences",
  "confidence": 0.0-1.0
}`,
    fallback
  );
}

export async function generateClinicianHandoff(
  profile: PatientProfile,
  structured: { symptoms: string[]; duration?: string; severity: string },
  triage: { urgency: string; department: string; reasoning: string }
): Promise<string> {
  const name = profile.name || 'Patient';
  const fallback = `${name} reports ${structured.symptoms.join(', ')}${
    structured.duration ? ` for ${structured.duration}` : ''
  }. ${triage.urgency} priority ${triage.department} review recommended. ${triage.reasoning}`;

  if (config.demoMode && !config.gemini.apiKey) return fallback;

  return generateText(
    `Write a concise clinician handoff note (3-4 sentences) for:
Patient: ${JSON.stringify(profile)}
Symptoms: ${structured.symptoms.join(', ')}
Duration: ${structured.duration || 'unknown'}
Severity: ${structured.severity}
Triage: ${JSON.stringify(triage)}
Professional clinical tone. No diagnosis — assessment and recommended next actions only.`,
    fallback
  );
}

export async function conversationalReply(
  phase: string,
  message: string,
  profile: PatientProfile,
  missingFields: string[],
  ragContext: string
): Promise<string> {
  const fallback = demoConversationalReply(phase, message, profile, missingFields);
  if (config.demoMode && !config.gemini.apiKey) return fallback;

  return generateText(
    `You are CareAssist AI, a production-grade conversational healthcare intake and triage assistant.
Your goal is to conduct intelligent, efficient, and natural patient intake conversations while minimizing unnecessary questions.

CORE BEHAVIOR RULES:
1. NEVER repeatedly ask the same question if the information already exists in conversation history or patient profile: ${JSON.stringify(profile)}.
2. Extract multiple fields from a single message whenever possible.
3. If the patient already provided name, age, gender, or symptoms, do NOT ask for them again.
4. If registration fields (name, age, gender) are partially missing, acknowledge the fields already provided, and politely ask for only the remaining missing fields (e.g., if they provided age, thank them and ask for name and gender; if they only provided age and name, thank them and ask specifically for gender). NEVER ask for a field they have already shared.
5. If optional fields (allergies, medications, existing conditions) are missing, ask exactly:
   "Would you like to share any medical conditions, medications, or allergies, or would you prefer to skip?"
6. Transition intelligently between registration, symptom collection, severity assessment, triage, and clinician handoff.
7. Minimize intake friction by avoiding rigid form-like interactions.
8. If symptoms indicate emergency risk (such as chest pain, breathing difficulty, stroke symptoms, suicide risk, or severe bleeding), acknowledge urgency calmly, advise immediate attention, and skip optional registration questions.
9. Be warm, concise, and natural. Avoid long robotic paragraphs.
10. Do not provide medical diagnosis. Encourage the patient to describe symptoms clearly.

Current Phase: ${phase}
Patient Profile so far: ${JSON.stringify(profile)}
Missing Fields: ${missingFields.join(', ')}
RAG Clinical Context: ${ragContext}
Patient last message: "${message}"

Respond naturally in 1-3 sentences following these guidelines exactly.`,
    fallback
  );
}

export async function extractProfileDetailsWithAI(
  message: string,
  history: string,
  currentProfile: PatientProfile
): Promise<Partial<PatientProfile>> {
  const fallback: Partial<PatientProfile> = {};
  if (config.demoMode && !config.gemini.apiKey) return fallback;

  const prompt = `Analyze the patient's latest message and conversation history to extract structured patient intake profile information.
Current Patient Profile: ${JSON.stringify(currentProfile)}
Conversation History:
${history}
Latest Message: "${message}"

Please extract the following fields if they are mentioned in the conversation (do NOT guess or hallucinate if they are not present, return null for fields that are not in the text):
1. "name" (string | null): Full name or first name.
2. "age" (number | null): Age in years. Extract ONLY a numeric age. If they say a number like "32" or "I am 32" or "thirty two", extract 32.
3. "gender" (string | null): Gender. Normalize to 'male', 'female', 'non-binary', 'other', or what they specifically state.
4. "existingConditions" (array of strings | null): Medical conditions. If they say "none" or "no conditions" or "skip", return [].
5. "medications" (array of strings | null): Medications they take. If they say "none" or "no meds" or "skip", return [].
6. "allergies" (array of strings | null): Allergies. If they say "none" or "no allergies" or "skip", return [].

Return ONLY a valid JSON object matching this schema:
{
  "name": string | null,
  "age": number | null,
  "gender": string | null,
  "existingConditions": string[] | null,
  "medications": string[] | null,
  "allergies": string[] | null
}`;

  try {
    const result = await generateJSON<any>(prompt, fallback);
    const updated: Partial<PatientProfile> = {};
    if (result.name) updated.name = result.name;
    if (result.age) updated.age = Number(result.age);
    if (result.gender) updated.gender = result.gender;
    if (Array.isArray(result.existingConditions)) updated.existingConditions = result.existingConditions;
    if (Array.isArray(result.medications)) updated.medications = result.medications;
    if (Array.isArray(result.allergies)) updated.allergies = result.allergies;
    return updated;
  } catch {
    return fallback;
  }
}

export async function generateTreatmentPlanWithAI(
  profile: PatientProfile,
  structuredIntake: any,
  triage: any,
  handoff: string
): Promise<string[]> {
  const fallback = [
    "Schedule priority follow-up with recommended specialist",
    "Monitor symptoms closely and report any worsening immediately",
    "Rest, hydrate, and maintain symptom log until clinical review"
  ];
  if (config.demoMode && !config.gemini.apiKey) return fallback;

  const prompt = `You are a senior clinical triaging physician assistant. Generate a highly personalized, practical 3-step action plan or treatment recommendation for this patient.
Patient Profile: ${JSON.stringify(profile)}
Structured Symptoms: ${JSON.stringify(structuredIntake)}
Triage Assessment: ${JSON.stringify(triage)}
Clinician Handoff Note: "${handoff}"

Return a JSON array of exactly 3 strings, each representing a clear, actionable instruction for this patient:
[
  "Action step 1...",
  "Action step 2...",
  "Action step 3..."
]`;

  try {
    return await generateJSON<string[]>(prompt, fallback);
  } catch {
    return fallback;
  }
}


function demoSymptomAnalysis(message: string) {
  const lower = message.toLowerCase();
  const symptoms: string[] = [];
  if (/chest|heart/.test(lower)) symptoms.push('chest pain');
  if (/fever|temperature/.test(lower)) symptoms.push('fever');
  if (/headache|head\s*ache/.test(lower)) symptoms.push('headache');
  if (/breath|breathing|dyspnea/.test(lower)) symptoms.push('shortness of breath');
  if (/rash|itch|skin/.test(lower)) symptoms.push('rash');
  if (/joint|knee|ankle|fracture/.test(lower)) symptoms.push('joint pain');
  if (/throat|ear|hearing/.test(lower)) symptoms.push('sore throat');
  if (/anxiety|depress|mood/.test(lower)) symptoms.push('anxiety');
  if (symptoms.length === 0) symptoms.push('general discomfort');

  const questions: string[] = [];
  if (symptoms.includes('chest pain')) {
    questions.push('Are you experiencing any shortness of breath or sweating with the chest pain?');
    questions.push('How long have you had this chest discomfort?');
  } else if (symptoms.includes('fever')) {
    questions.push('Do you know your current temperature, and how long have you had the fever?');
  } else if (symptoms.includes('headache')) {
    questions.push('Have you noticed any dizziness, blurred vision, or weakness?');
  } else {
    questions.push('Can you tell me more about when your symptoms started and how severe they feel?');
  }

  return {
    symptoms,
    severity: /severe|worst|can't|emergency/i.test(lower) ? 'high' : 'medium',
    intent: 'symptom_report',
    medicalRelevance: 'Patient-reported symptoms for triage routing',
    suggestedQuestions: questions,
  };
}

function demoStructuredIntake(symptoms: SymptomData) {
  const list = symptoms.symptoms.length ? symptoms.symptoms : ['general symptoms'];
  let dept: Department = 'General Medicine';
  if (list.some((s) => /chest|heart/.test(s))) dept = 'Cardiology';
  else if (list.some((s) => /head|dizz|vision|weak/.test(s))) dept = 'Neurology';
  else if (list.some((s) => /breath|lung|wheez/.test(s))) dept = 'Pulmonology';
  else if (list.some((s) => /joint|bone|fracture/.test(s))) dept = 'Orthopedics';
  else if (list.some((s) => /rash|skin|itch/.test(s))) dept = 'Dermatology';
  else if (list.some((s) => /throat|ear/.test(s))) dept = 'ENT';
  else if (list.some((s) => /anxiety|depress|mood/.test(s))) dept = 'Psychiatry';

  return {
    symptoms: list,
    duration: symptoms.duration || 'unspecified',
    severity: symptoms.severity || 'medium',
    recommended_department: dept,
    possible_concerns: list.map((s) => `Evaluate ${s}`),
  };
}

function demoTriageLLM(symptoms: string[], redFlags: string[]) {
  if (redFlags.length > 0) {
    return {
      urgency: 'emergency' as UrgencyLevel,
      department: 'Emergency Care' as Department,
      reasoning: `Red flags detected: ${redFlags.join(', ')}. Safety-first escalation applied.`,
      confidence: 0.95,
    };
  }
  const text = symptoms.join(' ').toLowerCase();
  if (/chest/.test(text))
    return {
      urgency: 'high' as UrgencyLevel,
      department: 'Cardiology' as Department,
      reasoning: 'Cardiac-related symptoms warrant expedited cardiology review.',
      confidence: 0.85,
    };
  return {
    urgency: 'medium' as UrgencyLevel,
    department: 'General Medicine' as Department,
    reasoning: 'Standard intake routing to general medicine for comprehensive assessment.',
    confidence: 0.75,
  };
}

function demoConversationalReply(
  phase: string,
  message: string,
  profile: PatientProfile,
  missing: string[]
): string {
  if (phase === 'greeting') {
    return "Welcome to CareAssist. I'm your AI intake assistant. Let's start with your registration: what is your full name, age, and gender?";
  }

  const registrationMissing = missing.filter(f => ['name', 'age', 'gender'].includes(f));
  if (registrationMissing.length > 0) {
    const nameStr = registrationMissing.includes('name') ? 'full name' : '';
    const ageStr = registrationMissing.includes('age') ? 'age' : '';
    const genderStr = registrationMissing.includes('gender') ? 'gender' : '';
    const missingParts = [nameStr, ageStr, genderStr].filter(Boolean);
    
    if (missingParts.length === 3) {
      return "Welcome to CareAssist. Let's start with your registration: what is your full name, age, and gender?";
    } else if (missingParts.length === 2) {
      const joined = missingParts.join(' and ');
      return `Thank you for sharing that. Could you please also let me know your ${joined}?`;
    } else if (missingParts.length === 1) {
      return `Thank you. Could you please tell me your ${missingParts[0]}?`;
    }
  }

  // Combined optional fields question
  if (missing.includes('existingConditions') || missing.includes('medications') || missing.includes('allergies')) {
    return "Would you like to share any medical conditions, medications, or allergies, or would you prefer to skip?";
  }

  if (phase === 'symptoms' || phase === 'clarification') {
    return `I understand. ${message.length > 20 ? 'Thank you for those details.' : ''} Please describe your main symptoms and how long you've had them.`;
  }
  return "I've recorded that information. Is there anything else about your symptoms you'd like to add?";
}
