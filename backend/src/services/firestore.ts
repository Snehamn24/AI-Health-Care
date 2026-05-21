import { Firestore } from '@google-cloud/firestore';
import { config } from '../config.js';
import type { IntakeSession, PatientProfile } from '../types/index.js';

const memoryPatients = new Map<string, PatientProfile & { id: string; createdAt: string }>();
const memorySessions = new Map<string, IntakeSession>();

let db: Firestore | null = null;

function getDb(): Firestore | null {
  if (config.demoMode && !process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  if (!db) db = new Firestore({ projectId: config.gcp.projectId });
  return db;
}

export async function savePatient(
  patientId: string,
  profile: PatientProfile
): Promise<void> {
  const data = { ...profile, updatedAt: new Date().toISOString() };
  const firestore = getDb();
  if (!firestore) {
    const existing = memoryPatients.get(patientId);
    memoryPatients.set(patientId, {
      id: patientId,
      ...profile,
      createdAt: existing?.createdAt || new Date().toISOString(),
    });
    return;
  }
  await firestore.collection(config.firestore.patients).doc(patientId).set(data, { merge: true });
}

export async function getPatient(patientId: string): Promise<PatientProfile | null> {
  const firestore = getDb();
  if (!firestore) {
    const p = memoryPatients.get(patientId);
    if (!p) return null;
    const { id: _id, createdAt: _c, ...profile } = p;
    return profile;
  }
  const doc = await firestore.collection(config.firestore.patients).doc(patientId).get();
  return doc.exists ? (doc.data() as PatientProfile) : null;
}

export async function saveSession(session: IntakeSession): Promise<void> {
  const firestore = getDb();
  if (!firestore) {
    memorySessions.set(session.id, session);
    return;
  }
  await firestore.collection(config.firestore.sessions).doc(session.id).set(session);
}

export async function getSession(sessionId: string): Promise<IntakeSession | null> {
  const firestore = getDb();
  if (!firestore) return memorySessions.get(sessionId) || null;
  const doc = await firestore.collection(config.firestore.sessions).doc(sessionId).get();
  return doc.exists ? (doc.data() as IntakeSession) : null;
}

export async function listSessions(limit = 50): Promise<IntakeSession[]> {
  const firestore = getDb();
  if (!firestore) {
    return [...memorySessions.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }
  const snap = await firestore
    .collection(config.firestore.sessions)
    .orderBy('updatedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as IntakeSession);
}
