import Database from 'better-sqlite3';
import path from 'path';

// Database file lives at backend/healthcare.db — professor can open with DB Browser for SQLite
const DB_PATH = path.join(process.cwd(), 'healthcare.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Table Creation ───

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    existing_conditions TEXT DEFAULT '[]',
    medications TEXT DEFAULT '[]',
    allergies TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    specialty TEXT NOT NULL,
    floor INTEGER DEFAULT 1,
    room TEXT DEFAULT 'TBD',
    hospital_location TEXT DEFAULT 'Main Building',
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    phase TEXT DEFAULT 'greeting',
    profile_json TEXT DEFAULT '{}',
    symptoms_json TEXT DEFAULT '{"symptoms":[]}',
    messages_json TEXT DEFAULT '[]',
    structured_intake_json TEXT,
    triage_json TEXT,
    clinician_handoff_json TEXT,
    doctor_suggestion_json TEXT,
    treatment_plan_json TEXT,
    fields_collected_json TEXT DEFAULT '[]',
    approval_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ─── Admin Settings ───

export function getAdminSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get(key) as any;
  return row?.value ?? null;
}

export function setAdminSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run(key, value);
}

// Initialize admin password if not set
if (!getAdminSetting('admin_password')) {
  setAdminSetting('admin_password', 'admin123');
}

// ─── Department Operations ───

export function dbGetDepartments(): string[] {
  const rows = db.prepare('SELECT name FROM departments ORDER BY name').all() as any[];
  return rows.map(r => r.name);
}

export function dbAddDepartment(name: string): boolean {
  try {
    db.prepare('INSERT INTO departments (name) VALUES (?)').run(name.trim());
    return true;
  } catch {
    return false; // duplicate
  }
}

export function dbDepartmentExists(name: string): boolean {
  const row = db.prepare('SELECT 1 FROM departments WHERE name = ?').get(name) as any;
  return !!row;
}

// ─── Doctor Operations ───

export interface DbDoctor {
  id: string;
  name: string;
  department: string;
  specialty: string;
  floor: number;
  room: string;
  hospital_location: string;
  username: string;
  password: string;
  created_at: string;
}

export function dbGetDoctors(): DbDoctor[] {
  return db.prepare('SELECT * FROM doctors ORDER BY name').all() as DbDoctor[];
}

export function dbGetDoctorById(id: string): DbDoctor | undefined {
  return db.prepare('SELECT * FROM doctors WHERE id = ?').get(id) as DbDoctor | undefined;
}

export function dbGetDoctorByUsername(username: string): DbDoctor | undefined {
  return db.prepare('SELECT * FROM doctors WHERE username = ?').get(username.toLowerCase().trim()) as DbDoctor | undefined;
}

export function dbInsertDoctor(doc: Omit<DbDoctor, 'created_at'>): boolean {
  try {
    db.prepare(
      'INSERT INTO doctors (id, name, department, specialty, floor, room, hospital_location, username, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(doc.id, doc.name, doc.department, doc.specialty, doc.floor, doc.room, doc.hospital_location, doc.username.toLowerCase().trim(), doc.password);
    return true;
  } catch {
    return false;
  }
}

export function dbUpdateDoctorPassword(doctorId: string, newPassword: string): boolean {
  const info = db.prepare('UPDATE doctors SET password = ? WHERE id = ?').run(newPassword, doctorId);
  return info.changes > 0;
}

export function dbGetDoctorForDepartment(dept: string): DbDoctor | undefined {
  return db.prepare('SELECT * FROM doctors WHERE department = ? LIMIT 1').get(dept) as DbDoctor | undefined;
}

// ─── Patient Operations ───

export interface DbPatient {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  existing_conditions: string;
  medications: string;
  allergies: string;
  created_at: string;
}

export function dbGetPatientByPhone(phone: string): DbPatient | undefined {
  return db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone.trim()) as DbPatient | undefined;
}

export function dbGetPatientById(id: string): DbPatient | undefined {
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as DbPatient | undefined;
}

export function dbInsertPatient(patient: Omit<DbPatient, 'created_at'>): boolean {
  try {
    db.prepare(
      'INSERT INTO patients (id, name, phone, age, gender, existing_conditions, medications, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(patient.id, patient.name, patient.phone.trim(), patient.age, patient.gender, patient.existing_conditions, patient.medications, patient.allergies);
    return true;
  } catch {
    return false;
  }
}

export function dbUpdatePatient(id: string, updates: Partial<DbPatient>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (k !== 'id' && k !== 'created_at') {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (fields.length === 0) return false;
  values.push(id);
  const info = db.prepare(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return info.changes > 0;
}

// ─── Session Operations ───

export interface DbSession {
  id: string;
  patient_id: string | null;
  phase: string;
  profile_json: string;
  symptoms_json: string;
  messages_json: string;
  structured_intake_json: string | null;
  triage_json: string | null;
  clinician_handoff_json: string | null;
  doctor_suggestion_json: string | null;
  treatment_plan_json: string | null;
  fields_collected_json: string;
  approval_status: string;
  created_at: string;
  updated_at: string;
}

export function dbInsertSession(session: DbSession): void {
  db.prepare(`
    INSERT OR REPLACE INTO sessions
      (id, patient_id, phase, profile_json, symptoms_json, messages_json,
       structured_intake_json, triage_json, clinician_handoff_json,
       doctor_suggestion_json, treatment_plan_json, fields_collected_json,
       approval_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id, session.patient_id, session.phase,
    session.profile_json, session.symptoms_json, session.messages_json,
    session.structured_intake_json, session.triage_json, session.clinician_handoff_json,
    session.doctor_suggestion_json, session.treatment_plan_json, session.fields_collected_json,
    session.approval_status, session.created_at, session.updated_at
  );
}

export function dbGetSession(id: string): DbSession | undefined {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as DbSession | undefined;
}

export function dbListSessions(limit = 50): DbSession[] {
  return db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?').all(limit) as DbSession[];
}

export function dbGetSessionsByPatient(patientId: string): DbSession[] {
  return db.prepare('SELECT * FROM sessions WHERE patient_id = ? ORDER BY created_at DESC').all(patientId) as DbSession[];
}

export function dbUpdateSessionApproval(sessionId: string, status: 'approved' | 'rejected'): boolean {
  const info = db.prepare('UPDATE sessions SET approval_status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, sessionId);
  return info.changes > 0;
}

export function dbLinkSessionToPatient(sessionId: string, patientId: string): boolean {
  const info = db.prepare('UPDATE sessions SET patient_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(patientId, sessionId);
  return info.changes > 0;
}

// ─── Utility ───

export function dbGetStats() {
  const patients = (db.prepare('SELECT COUNT(*) as cnt FROM patients').get() as any).cnt;
  const doctors = (db.prepare('SELECT COUNT(*) as cnt FROM doctors').get() as any).cnt;
  const sessions = (db.prepare('SELECT COUNT(*) as cnt FROM sessions').get() as any).cnt;
  const departments = (db.prepare('SELECT COUNT(*) as cnt FROM departments').get() as any).cnt;
  return { patients, doctors, sessions, departments, dbPath: DB_PATH };
}

export { db };
