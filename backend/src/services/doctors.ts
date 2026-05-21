import type { Department, UrgencyLevel } from '../types/index.js';

export interface Doctor {
  id: string;
  name: string;
  department: Department;
  specialty: string;
  floor: number;
  room: string;
  hospitalLocation: string;
}

export interface DoctorCredentials {
  username: string;
  password: string;
  doctorId: string;
  role: 'doctor' | 'admin';
}

// ─── Dynamic Doctor Registry (In-Memory for demo, Firestore for production) ───
const doctorRegistry: Map<string, Doctor> = new Map();
const credentialStore: Map<string, DoctorCredentials> = new Map();

// ─── Seed Default Doctors ───
const SEED_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Jenkins',
    department: 'Cardiology',
    specialty: 'Interventional Cardiology',
    floor: 3,
    room: '305',
    hospitalLocation: 'Building C, Wing 3',
  },
  {
    id: 'doc-2',
    name: 'Dr. Alan Turing',
    department: 'Neurology',
    specialty: 'Clinical Neurology & Neurogenetics',
    floor: 4,
    room: '412',
    hospitalLocation: 'Building B, Wing 4',
  },
  {
    id: 'doc-3',
    name: 'Dr. Marcus Welby',
    department: 'Orthopedics',
    specialty: 'Orthopedic Surgery & Joint Reconstruction',
    floor: 2,
    room: '204',
    hospitalLocation: 'Building A, Wing 2',
  },
  {
    id: 'doc-4',
    name: 'Dr. Elizabeth Blackwell',
    department: 'Pulmonology',
    specialty: 'Pulmonary & Critical Care Medicine',
    floor: 3,
    room: '318',
    hospitalLocation: 'Building C, Wing 3',
  },
  {
    id: 'doc-5',
    name: 'Dr. Gregory House',
    department: 'Dermatology',
    specialty: 'Clinical Dermatology & Diagnostic Pathology',
    floor: 2,
    room: '221',
    hospitalLocation: 'Building B, Wing 2',
  },
  {
    id: 'doc-6',
    name: 'Dr. Fiona Gallagher',
    department: 'ENT',
    specialty: 'Otolaryngology & Throat Care',
    floor: 1,
    room: '145',
    hospitalLocation: 'Building A, Wing 1',
  },
  {
    id: 'doc-7',
    name: 'Dr. Sigmund Freud',
    department: 'Psychiatry',
    specialty: 'Clinical Psychiatry & Psychotherapy',
    floor: 5,
    room: '501',
    hospitalLocation: 'Building D, Wing 5',
  },
  {
    id: 'doc-8',
    name: 'Dr. John Carter',
    department: 'Emergency Care',
    specialty: 'Emergency Medicine & Trauma',
    floor: 1,
    room: 'ER-1',
    hospitalLocation: 'Emergency Care Pavilion, Ground Floor',
  },
  {
    id: 'doc-9',
    name: 'Dr. Robert Chen',
    department: 'General Medicine',
    specialty: 'Family & Internal Medicine',
    floor: 1,
    room: '102',
    hospitalLocation: 'Building A, Ground Floor',
  },
];

function seedDefaults() {
  // Register all default doctors
  for (const doc of SEED_DOCTORS) {
    doctorRegistry.set(doc.id, doc);
    // Generate username from first name lowercase
    const firstName = doc.name.replace('Dr. ', '').split(' ')[0].toLowerCase();
    credentialStore.set(firstName, {
      username: firstName,
      password: 'password',
      doctorId: doc.id,
      role: 'doctor',
    });
  }

  // Register admin account
  credentialStore.set('admin', {
    username: 'admin',
    password: 'admin123',
    doctorId: 'admin',
    role: 'admin',
  });
}

// Initialize on module load
seedDefaults();

// ─── Public API ───

/** Get all registered doctors */
export function getDoctors(): Doctor[] {
  return Array.from(doctorRegistry.values());
}

// Keep backward-compat export
export const DOCTORS = getDoctors();

/** Find a doctor by their ID */
export function getDoctorById(id: string): Doctor | undefined {
  return doctorRegistry.get(id);
}

/** Find a doctor matching a department */
export function getDoctorForDepartment(dept: Department): Doctor {
  const all = getDoctors();
  const found = all.find((d) => d.department === dept);
  return found || all.find((d) => d.department === 'General Medicine')!;
}

/** Validate login credentials. Returns user info or null. */
export function validateCredentials(
  username: string,
  password: string
): { role: 'doctor' | 'admin'; doctorId: string; name: string; department?: string } | null {
  const cred = credentialStore.get(username.toLowerCase().trim());
  if (!cred || cred.password !== password) return null;

  if (cred.role === 'admin') {
    return { role: 'admin', doctorId: 'admin', name: 'Hospital Administrator' };
  }

  const doc = doctorRegistry.get(cred.doctorId);
  if (!doc) return null;

  return {
    role: 'doctor',
    doctorId: doc.id,
    name: doc.name,
    department: doc.department,
  };
}

/** Register a new doctor (admin action) */
export function registerDoctor(
  doc: Omit<Doctor, 'id'>,
  username: string,
  password: string
): { success: boolean; doctor?: Doctor; error?: string } {
  // Check username uniqueness
  if (credentialStore.has(username.toLowerCase().trim())) {
    return { success: false, error: 'Username already taken' };
  }

  const id = `doc-${Date.now()}`;
  const newDoc: Doctor = { id, ...doc };

  doctorRegistry.set(id, newDoc);
  credentialStore.set(username.toLowerCase().trim(), {
    username: username.toLowerCase().trim(),
    password,
    doctorId: id,
    role: 'doctor',
  });

  return { success: true, doctor: newDoc };
}

/** Generate appointment slot text based on urgency */
export function generateAppointment(urgency: UrgencyLevel): string {
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
