import { config } from '../config.js';
import type { IntakeSession, PatientProfile } from '../types/index.js';
import {
  dbInsertSession, dbGetSession as dbGetSessionRaw, dbListSessions as dbListSessionsRaw,
  dbInsertPatient, dbGetPatientById, dbUpdatePatient,
  type DbSession
} from './database.js';
import { v4 as uuidv4 } from 'uuid';

// ─── Conversion helpers: IntakeSession <-> DbSession ───

function sessionToDb(session: IntakeSession): DbSession {
  return {
    id: session.id,
    patient_id: (session as any).linkedPatientId || null,
    phase: session.phase,
    profile_json: JSON.stringify(session.profile || {}),
    symptoms_json: JSON.stringify(session.symptoms || { symptoms: [] }),
    messages_json: JSON.stringify(session.messages || []),
    structured_intake_json: session.structuredIntake ? JSON.stringify(session.structuredIntake) : null,
    triage_json: session.triage ? JSON.stringify(session.triage) : null,
    clinician_handoff_json: session.clinicianHandoff ? JSON.stringify(session.clinicianHandoff) : null,
    doctor_suggestion_json: session.doctorSuggestion ? JSON.stringify(session.doctorSuggestion) : null,
    treatment_plan_json: session.treatmentPlan ? JSON.stringify(session.treatmentPlan) : null,
    fields_collected_json: JSON.stringify(session.fieldsCollected || []),
    approval_status: (session as any).approvalStatus || 'pending',
    doctor_viewed: (session as any).doctorViewed ? 1 : 0,
    doctor_viewed_at: (session as any).doctorViewedAt || null,
    prescription_json: (session as any).prescription ? JSON.stringify((session as any).prescription) : null,
    clinical_notes_json: (session as any).clinicalNotes ? JSON.stringify((session as any).clinicalNotes) : null,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function dbToSession(row: DbSession): IntakeSession {
  return {
    id: row.id,
    patientId: row.patient_id || '',
    phase: row.phase as any,
    profile: JSON.parse(row.profile_json || '{}'),
    symptoms: JSON.parse(row.symptoms_json || '{"symptoms":[]}'),
    messages: JSON.parse(row.messages_json || '[]'),
    structuredIntake: row.structured_intake_json ? JSON.parse(row.structured_intake_json) : undefined,
    triage: row.triage_json ? JSON.parse(row.triage_json) : undefined,
    clinicianHandoff: row.clinician_handoff_json ? JSON.parse(row.clinician_handoff_json) : undefined,
    doctorSuggestion: row.doctor_suggestion_json ? JSON.parse(row.doctor_suggestion_json) : undefined,
    treatmentPlan: row.treatment_plan_json ? JSON.parse(row.treatment_plan_json) : undefined,
    fieldsCollected: JSON.parse(row.fields_collected_json || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Extra fields for admin/doctor/patient views
    ...(row.approval_status ? { approvalStatus: row.approval_status } : {}),
    ...(row.patient_id ? { linkedPatientId: row.patient_id } : {}),
    ...(row.doctor_viewed !== undefined ? { doctorViewed: row.doctor_viewed === 1 } : {}),
    ...(row.doctor_viewed_at ? { doctorViewedAt: row.doctor_viewed_at } : {}),
    ...(row.prescription_json ? { prescription: JSON.parse(row.prescription_json) } : { prescription: null }),
    ...(row.clinical_notes_json ? { clinicalNotes: JSON.parse(row.clinical_notes_json) } : { clinicalNotes: null }),
  } as IntakeSession;
}

// ─── Public API (same interface as before) ───

export async function savePatient(
  patientId: string,
  profile: PatientProfile
): Promise<void> {
  const existing = dbGetPatientById(patientId);
  if (existing) {
    dbUpdatePatient(patientId, {
      name: profile.name || existing.name,
      age: profile.age ?? existing.age,
      gender: profile.gender || existing.gender,
      existing_conditions: JSON.stringify(profile.existingConditions || []),
      medications: JSON.stringify(profile.medications || []),
      allergies: JSON.stringify(profile.allergies || []),
    });
  } else {
    dbInsertPatient({
      id: patientId,
      name: profile.name || 'Unknown',
      phone: '',
      age: profile.age ?? null,
      gender: profile.gender || null,
      existing_conditions: JSON.stringify(profile.existingConditions || []),
      medications: JSON.stringify(profile.medications || []),
      allergies: JSON.stringify(profile.allergies || []),
    });
  }
}

export async function getPatient(patientId: string): Promise<PatientProfile | null> {
  const p = dbGetPatientById(patientId);
  if (!p) return null;
  return {
    name: p.name,
    age: p.age ?? undefined,
    gender: p.gender ?? undefined,
    existingConditions: JSON.parse(p.existing_conditions || '[]'),
    medications: JSON.parse(p.medications || '[]'),
    allergies: JSON.parse(p.allergies || '[]'),
  };
}

export async function saveSession(session: IntakeSession): Promise<void> {
  dbInsertSession(sessionToDb(session));
}

export async function getSession(sessionId: string): Promise<IntakeSession | null> {
  const row = dbGetSessionRaw(sessionId);
  if (!row) return null;
  return dbToSession(row);
}

export async function listSessions(limit = 50): Promise<IntakeSession[]> {
  const rows = dbListSessionsRaw(limit);
  return rows.map(dbToSession);
}
