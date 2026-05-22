import type { Department, UrgencyLevel } from '../types/index.js';
import {
  dbGetDoctors, dbGetDoctorById, dbGetDoctorByUsername, dbGetDoctorForDepartment,
  dbInsertDoctor, dbUpdateDoctorPassword, dbUpdateDoctorStatus,
  dbGetDepartments, dbAddDepartment,
  getAdminSetting, setAdminSetting,
  type DbDoctor
} from './database.js';

export interface Doctor {
  id: string;
  name: string;
  department: string;
  specialty: string;
  floor: number;
  room: string;
  hospitalLocation: string;
  availabilityStatus: string;
}

export interface DoctorCredentials {
  username: string;
  password: string;
  doctorId: string;
  role: 'doctor' | 'admin';
}

// ─── Conversion helper ───
function dbToDoctor(d: DbDoctor): Doctor {
  return {
    id: d.id,
    name: d.name,
    department: d.department,
    specialty: d.specialty,
    floor: d.floor,
    room: d.room,
    hospitalLocation: d.hospital_location,
    availabilityStatus: d.availability_status || 'available',
  };
}

// ─── Public API ───

/** Get all registered departments from SQLite */
export function getDepartments(): string[] {
  return dbGetDepartments();
}

/** Add a new department to SQLite */
export function addDepartment(name: string): boolean {
  if (!name || name.trim() === '') return false;
  return dbAddDepartment(name.trim());
}

/** Change admin password in SQLite */
export function changeAdminPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.trim() === '') return false;
  setAdminSetting('admin_password', newPassword.trim());
  return true;
}

/** Get all registered doctors from SQLite */
export function getDoctors(): Doctor[] {
  return dbGetDoctors().map(dbToDoctor);
}

// Keep backward-compat export
export const DOCTORS = getDoctors();

/** Find a doctor by their ID */
export function getDoctorById(id: string): Doctor | undefined {
  const d = dbGetDoctorById(id);
  return d ? dbToDoctor(d) : undefined;
}

/** Find a doctor matching a department */
export function getDoctorForDepartment(dept: string): Doctor {
  const d = dbGetDoctorForDepartment(dept);
  if (d) return dbToDoctor(d);
  // Fallback to General Medicine
  const fallback = dbGetDoctors().find(doc => doc.department === 'General Medicine');
  if (fallback) return dbToDoctor(fallback);
  // Last resort: return first doctor
  const all = dbGetDoctors();
  return dbToDoctor(all[0]);
}

/** Validate login credentials. Returns user info or null. */
export function validateCredentials(
  username: string,
  password: string
): { role: 'doctor' | 'admin'; doctorId: string; name: string; department?: string } | null {
  const uname = username.toLowerCase().trim();

  // Check admin
  if (uname === 'admin') {
    const adminPass = getAdminSetting('admin_password') || 'admin123';
    if (password !== adminPass) return null;
    return { role: 'admin', doctorId: 'admin', name: 'Hospital Administrator' };
  }

  // Check doctor credentials from SQLite
  const doc = dbGetDoctorByUsername(uname);
  if (!doc || doc.password !== password) return null;

  return {
    role: 'doctor',
    doctorId: doc.id,
    name: doc.name,
    department: doc.department,
  };
}

/** Register a new doctor (admin action) — persisted to SQLite */
export function registerDoctor(
  doc: Omit<Doctor, 'id'>,
  username: string,
  password: string
): { success: boolean; doctor?: Doctor; error?: string } {
  // Check username uniqueness
  const existing = dbGetDoctorByUsername(username);
  if (existing) {
    return { success: false, error: 'Username already taken' };
  }

  const id = `doc-${Date.now()}`;
  const success = dbInsertDoctor({
    id,
    name: doc.name,
    department: doc.department,
    specialty: doc.specialty,
    floor: doc.floor,
    room: doc.room,
    hospital_location: doc.hospitalLocation,
    username: username.toLowerCase().trim(),
    password,
    availability_status: 'available',
  });

  if (!success) {
    return { success: false, error: 'Failed to register doctor' };
  }

  return { success: true, doctor: { id, ...doc } };
}

/** Change a doctor's own password */
export function changeDoctorPassword(
  doctorId: string,
  currentPassword: string,
  newPassword: string
): { success: boolean; error?: string } {
  const doc = dbGetDoctorById(doctorId);
  if (!doc) return { success: false, error: 'Doctor not found' };
  if (doc.password !== currentPassword) return { success: false, error: 'Current password is incorrect' };
  if (!newPassword || newPassword.trim().length < 3) return { success: false, error: 'New password must be at least 3 characters' };

  const updated = dbUpdateDoctorPassword(doctorId, newPassword.trim());
  return updated ? { success: true } : { success: false, error: 'Failed to update password' };
}

/** Update a doctor's availability status */
export function updateDoctorStatus(
  doctorId: string,
  status: string
): { success: boolean; error?: string } {
  const validStatuses = ['available', 'in_consult', 'on_break', 'off_duty'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }
  const updated = dbUpdateDoctorStatus(doctorId, status);
  return updated ? { success: true } : { success: false, error: 'Doctor not found' };
}

/** Generate appointment slot text based on urgency */
export function generateAppointment(urgency: string): string {
  if (urgency === 'emergency') {
    return 'Immediate - Proceed directly to Emergency Pavilion';
  }
  if (urgency === 'urgent') {
    return 'Priority Walk-in - Est. wait < 15 mins';
  }

  const now = new Date();
  const appointmentTime = new Date(now.getTime() + 30 * 60 * 1000);
  let hours = appointmentTime.getHours();
  const minutes = appointmentTime.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `Today at ${hours}:${minutesStr} ${ampm}`;
}

/** Get doctors with credentials for admin console visualization */
export function getDoctorsWithCredentials() {
  return dbGetDoctors().map((doc) => ({
    id: doc.id,
    name: doc.name,
    department: doc.department,
    specialty: doc.specialty,
    floor: doc.floor,
    room: doc.room,
    hospitalLocation: doc.hospital_location,
    username: doc.username,
    password: doc.password,
    availabilityStatus: doc.availability_status || 'available',
  }));
}
