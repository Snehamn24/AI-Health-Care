import { Router } from 'express';
import multer from 'multer';
import { createSession, processMessage } from '../services/intake-orchestrator.js';
import { getSession, listSessions, saveSession } from '../services/firestore.js';
import { getAnalyticsSummary } from '../services/bigquery.js';
import { speechToText, textToSpeechAudio } from '../services/speech.js';
import { seedClinicalGuidelines } from '../services/pinecone.js';
import { config } from '../config.js';
import { getDoctors, validateCredentials, registerDoctor } from '../services/doctors.js';
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
      { step: 10, name: 'Firestore + BigQuery', status: session.phase === 'complete' ? 'complete' : 'pending' },
    ],
    session: {
      phase: session.phase,
      triage: session.triage,
      structuredIntake: session.structuredIntake,
      handoff: session.clinicianHandoff,
    },
  });
});
