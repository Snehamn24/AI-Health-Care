import { Router } from 'express';
import multer from 'multer';
import { createSession, processMessage } from '../services/intake-orchestrator.js';
import { getSession, listSessions, saveSession } from '../services/firestore.js';
import { getAnalyticsSummary } from '../services/bigquery.js';
import { speechToText, textToSpeechAudio } from '../services/speech.js';
import { seedClinicalGuidelines } from '../services/pinecone.js';
import { config } from '../config.js';
import { getDoctors, validateCredentials, registerDoctor, getDepartments, addDepartment, changeAdminPassword, getDoctorsWithCredentials, changeDoctorPassword } from '../services/doctors.js';
import {
  getEmergencyQueueByDepartment,
  getAppointmentsByDepartment,
  getPatientCardsByDepartment,
  getFollowUpsByDepartment,
  getClinicalStats,
} from '../services/clinical-records.js';
import {
  dbGetPatientByPhone, dbInsertPatient, dbGetPatientById, dbUpdatePatient,
  dbGetSessionsByPatient, dbUpdateSessionApproval, dbLinkSessionToPatient,
  dbGetStats, getAdminSetting, dbGetSessionsByDepartment
} from '../services/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { Department } from '../types/index.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'healthcare-intake-triage',
    demoMode: config.demoMode,
    timestamp: new Date().toISOString(),
  });
});

// ─── Authentication ───

apiRouter.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    const user = validateCredentials(username, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    res.json({ success: true, user });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

apiRouter.post('/admin/register-doctor', (req, res) => {
  try {
    const { name, department, specialty, floor, room, hospitalLocation, username, password } = req.body;
    if (!name || !department || !specialty || !username || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    const result = registerDoctor(
      {
        name,
        department: department as Department,
        specialty,
        floor: floor || 1,
        room: room || 'TBD',
        hospitalLocation: hospitalLocation || 'Main Building',
      },
      username,
      password
    );
    if (!result.success) {
      return res.status(409).json(result);
    }
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ─── Sessions ───

apiRouter.post('/sessions', async (_req, res) => {
  try {
    const session = await createSession();
    res.status(201).json(session);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

apiRouter.get('/sessions/by-department', (req, res) => {
  const dept = (req.query.dept as string) || 'General Medicine';
  const sessions = dbGetSessionsByDepartment(dept);
  const formatted = sessions.map(s => ({
    id: s.id,
    phase: s.phase,
    profile: JSON.parse(s.profile_json || '{}'),
    symptoms: JSON.parse(s.symptoms_json || '{}'),
    triage: JSON.parse(s.triage_json || '{}'),
    clinicianHandoff: JSON.parse(s.clinician_handoff_json || '{}'),
    structuredIntake: s.structured_intake_json ? JSON.parse(s.structured_intake_json) : null,
    treatmentPlan: s.treatment_plan_json ? JSON.parse(s.treatment_plan_json) : null,
    approvalStatus: s.approval_status,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
  res.json(formatted);
});

apiRouter.get('/sessions/:id', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

apiRouter.get('/sessions', async (_req, res) => {
  const sessions = await listSessions();
  res.json(sessions);
});

apiRouter.post('/sessions/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });
    const result = await processMessage(req.params.id, message.trim());
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Doctors ───

apiRouter.get('/doctors', (_req, res) => {
  res.json(getDoctors());
});

apiRouter.post('/sessions/:id/send-to-doctor', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.doctorSuggestion) {
      session.doctorSuggestion.infoSentToDoctor = true;
    } else {
      return res.status(400).json({ error: 'Triage not complete yet. Patient does not have a assigned doctor.' });
    }

    await saveSession(session);
    res.json({ success: true, session });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

apiRouter.post('/sessions/:id/treatment-plan', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { generateTreatmentPlanWithAI } = await import('../services/gemini.js');
    const plan = await generateTreatmentPlanWithAI(
      session.profile,
      session.structuredIntake,
      session.triage,
      session.clinicianHandoff?.summary || ''
    );

    session.treatmentPlan = plan;
    await saveSession(session);

    res.json({ success: true, plan, session });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Guidelines RAG Search ───

apiRouter.get('/guidelines/search', async (req, res) => {
  try {
    const q = req.query.q as string || '';
    const { searchClinicalContext } = await import('../services/pinecone.js');
    const results = await searchClinicalContext(q, 5);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Speech ───

apiRouter.post('/speech/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'audio file required' });
    const transcript = await speechToText(req.file.buffer, req.file.mimetype);
    res.json({ transcript });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

apiRouter.post('/speech/synthesize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const audio = await textToSpeechAudio(text);
    res.json(audio);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Analytics ───

apiRouter.get('/analytics/summary', async (_req, res) => {
  const summary = await getAnalyticsSummary();
  res.json(summary);
});

apiRouter.post('/admin/seed-pinecone', async (_req, res) => {
  const result = await seedClinicalGuidelines();
  res.json(result);
});

// ─── Workflow Explain ───

apiRouter.get('/workflow/explain/:sessionId', async (req, res) => {
  const session = await getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({
    title: 'Explainable AI Workflow',
    steps: [
      { step: 1, name: 'Patient Input', status: 'complete', detail: 'Voice/Text captured' },
      { step: 2, name: 'Speech-to-Text', status: 'complete', detail: 'Audio converted when voice used' },
      { step: 3, name: 'Gemini Symptom Analysis', status: session.symptoms.symptoms.length ? 'complete' : 'pending' },
      { step: 4, name: 'Clarifying Questions', status: session.phase === 'clarification' ? 'active' : 'complete' },
      { step: 5, name: 'Structured Extraction', status: session.structuredIntake ? 'complete' : 'pending' },
      { step: 6, name: 'Embedding + Pinecone RAG', status: 'complete', detail: 'Clinical guideline retrieval' },
      { step: 7, name: 'Hybrid Triage', status: session.triage ? 'complete' : 'pending', detail: session.triage },
      { step: 8, name: 'Department Routing', status: session.triage ? 'complete' : 'pending', detail: session.triage?.department },
      { step: 9, name: 'Clinician Handoff', status: session.clinicianHandoff ? 'complete' : 'pending' },
      { step: 10, name: 'SQLite Persistence', status: session.phase === 'complete' ? 'complete' : 'pending' },
    ],
    session: {
      phase: session.phase,
      triage: session.triage,
      structuredIntake: session.structuredIntake,
      handoff: session.clinicianHandoff,
    },
  });
});

// ─── Dynamic Departments ───

apiRouter.get('/departments', (_req, res) => {
  res.json(getDepartments());
});

apiRouter.post('/departments', (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'Department name is required' });
    }
    const success = addDepartment(name.trim());
    if (!success) {
      return res.status(400).json({ success: false, error: 'Department already exists or invalid name' });
    }
    res.status(201).json({ success: true, departments: getDepartments() });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

apiRouter.post('/admin/change-password', (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword?.trim()) {
      return res.status(400).json({ success: false, error: 'New password is required' });
    }
    const success = changeAdminPassword(newPassword);
    if (!success) {
      return res.status(500).json({ success: false, error: 'Failed to update password' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ─── Dynamic Clinical Workstation Data ───

apiRouter.get('/admin/doctors-credentials', (_req, res) => {
  res.json(getDoctorsWithCredentials());
});

apiRouter.get('/clinical/appointments', (req, res) => {
  const dept = (req.query.dept as string) || 'Cardiology';
  res.json(getAppointmentsByDepartment(dept));
});

apiRouter.get('/clinical/emergencies', (req, res) => {
  const dept = (req.query.dept as string) || 'Cardiology';
  res.json(getEmergencyQueueByDepartment(dept));
});

apiRouter.get('/clinical/patients', (req, res) => {
  const dept = (req.query.dept as string) || 'Cardiology';
  res.json(getPatientCardsByDepartment(dept));
});

apiRouter.get('/clinical/followups', (req, res) => {
  const dept = (req.query.dept as string) || 'Cardiology';
  res.json(getFollowUpsByDepartment(dept));
});

apiRouter.get('/clinical/stats', (_req, res) => {
  res.json(getClinicalStats());
});



// ═══════════════════════════════════════════════════════════════
// NEW ENDPOINTS: Patient accounts, session history, approvals
// ═══════════════════════════════════════════════════════════════

// ─── Patient Registration & Login ───

apiRouter.post('/patient/register', (req, res) => {
  try {
    const { name, phone, age, gender, existingConditions, medications, allergies } = req.body;
    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ success: false, error: 'Name and phone number are required' });
    }

    // Check if patient already exists by phone
    const existing = dbGetPatientByPhone(phone.trim());
    if (existing) {
      // Update name if different (patient might use different formatting)
      if (existing.name.toLowerCase() !== name.trim().toLowerCase()) {
        dbUpdatePatient(existing.id, { name: name.trim() });
        const updated = dbGetPatientById(existing.id);
        return res.json({ success: true, patient: updated, message: 'Welcome back! Account updated.' });
      }
      return res.json({ success: true, patient: existing, message: 'Welcome back! Account found.' });
    }

    const id = uuidv4();
    const inserted = dbInsertPatient({
      id,
      name: name.trim(),
      phone: phone.trim(),
      age: age || null,
      gender: gender || null,
      existing_conditions: JSON.stringify(existingConditions || []),
      medications: JSON.stringify(medications || []),
      allergies: JSON.stringify(allergies || []),
    });

    if (!inserted) {
      return res.status(500).json({ success: false, error: 'Failed to create patient account' });
    }

    const patient = dbGetPatientById(id);
    res.status(201).json({ success: true, patient, message: 'Account created successfully!' });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

apiRouter.post('/patient/login', (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const patient = dbGetPatientByPhone(phone.trim());
    if (!patient) {
      return res.status(404).json({ success: false, error: 'No account found with this phone number. Please complete an AI Intake consultation and save your visit first.' });
    }

    // Name check is lenient — just verify it's not completely wrong
    if (name?.trim() && patient.name.toLowerCase() !== name.trim().toLowerCase()) {
      // Update the stored name to match what user entered (they know their own name)
      dbUpdatePatient(patient.id, { name: name.trim() });
    }

    const updated = dbGetPatientById(patient.id);
    res.json({ success: true, patient: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ─── Patient History ───

apiRouter.get('/patient/:id/history', (req, res) => {
  try {
    const sessions = dbGetSessionsByPatient(req.params.id);
    // Convert DB rows to frontend-friendly format
    const history = sessions.map(s => ({
      id: s.id,
      phase: s.phase,
      profile: JSON.parse(s.profile_json || '{}'),
      symptoms: JSON.parse(s.symptoms_json || '{"symptoms":[]}'),
      messages: JSON.parse(s.messages_json || '[]'),
      triage: s.triage_json ? JSON.parse(s.triage_json) : null,
      clinicianHandoff: s.clinician_handoff_json ? JSON.parse(s.clinician_handoff_json) : null,
      doctorSuggestion: s.doctor_suggestion_json ? JSON.parse(s.doctor_suggestion_json) : null,
      treatmentPlan: s.treatment_plan_json ? JSON.parse(s.treatment_plan_json) : null,
      approvalStatus: s.approval_status,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── Link Session to Patient (save conversation) ───

apiRouter.post('/sessions/:id/save-to-patient', (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required' });
    }
    const linked = dbLinkSessionToPatient(req.params.id, patientId);
    res.json({ success: linked });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ─── Session Approval (Admin) ───

apiRouter.patch('/sessions/:id/approve', (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be "approved" or "rejected"' });
    }
    const updated = dbUpdateSessionApproval(req.params.id, status);
    res.json({ success: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ─── Doctor Change Password ───

apiRouter.post('/doctor/change-password', (req, res) => {
  try {
    const { doctorId, currentPassword, newPassword } = req.body;
    if (!doctorId || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    const result = changeDoctorPassword(doctorId, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ─── Database Stats (for admin overview) ───

apiRouter.get('/db/stats', (_req, res) => {
  try {
    const stats = dbGetStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
