import type { AnalyticsSummary, IntakeSession, WorkflowExplain } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export interface AuthUser {
  role: 'doctor' | 'admin';
  doctorId: string;
  name: string;
  department?: string;
}

export interface DoctorInfo {
  id: string;
  name: string;
  department: string;
  specialty: string;
  floor: number;
  room: string;
  hospitalLocation: string;
}

export interface PatientAccount {
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

export interface DbStats {
  patients: number;
  doctors: number;
  sessions: number;
  departments: number;
  dbPath: string;
}

export const api = {
  health: () => request<{ status: string; demoMode: boolean }>('/health'),

  // ─── Auth ───
  login: (username: string, password: string) =>
    request<{ success: boolean; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  registerDoctor: (data: {
    name: string;
    department: string;
    specialty: string;
    floor: number;
    room: string;
    hospitalLocation: string;
    username: string;
    password: string;
  }) =>
    request<{ success: boolean; doctor?: DoctorInfo; error?: string }>('/admin/register-doctor', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Sessions ───
  createSession: () => request<IntakeSession>('/sessions', { method: 'POST' }),
  getSession: (id: string) => request<IntakeSession>(`/sessions/${id}`),
  listSessions: () => request<IntakeSession[]>('/sessions'),
  sendMessage: (sessionId: string, message: string) =>
    request<{ session: IntakeSession; reply: string; workflow?: unknown }>(
      `/sessions/${sessionId}/message`,
      { method: 'POST', body: JSON.stringify({ message }) }
    ),

  // ─── Doctors ───
  getDoctors: () => request<DoctorInfo[]>('/doctors'),

  // ─── Speech ───
  transcribe: async (blob: Blob) => {
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    return request<{ transcript: string }>('/speech/transcribe', { method: 'POST', body: form });
  },
  synthesize: (text: string) =>
    request<{ audioContent: string; contentType: string }>('/speech/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // ─── Analytics & Workflow ───
  analytics: () => request<AnalyticsSummary>('/analytics/summary'),
  explainWorkflow: (sessionId: string) =>
    request<WorkflowExplain>(`/workflow/explain/${sessionId}`),

  // ─── Doctor Actions ───
  sendToDoctor: (sessionId: string) =>
    request<{ success: boolean; session: IntakeSession }>(`/sessions/${sessionId}/send-to-doctor`, {
      method: 'POST',
    }),
  generateTreatmentPlan: (sessionId: string) =>
    request<{ success: boolean; plan: string[]; session: IntakeSession }>(`/sessions/${sessionId}/treatment-plan`, {
      method: 'POST',
    }),
  searchGuidelines: (q: string) =>
    request<any[]>(`/guidelines/search?q=${encodeURIComponent(q)}`),
  getDepartments: () =>
    request<string[]>('/departments'),
  addDepartment: (name: string) =>
    request<{ success: boolean; departments?: string[]; error?: string }>('/departments', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  changeAdminPassword: (newPassword: string) =>
    request<{ success: boolean; error?: string }>('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  getDoctorsWithCredentials: () =>
    request<any[]>('/admin/doctors-credentials'),
  getClinicalAppointments: (dept: string) =>
    request<any[]>(`/clinical/appointments?dept=${encodeURIComponent(dept)}`),
  getClinicalEmergencies: (dept: string) =>
    request<any[]>(`/clinical/emergencies?dept=${encodeURIComponent(dept)}`),
  getClinicalPatients: (dept: string) =>
    request<any[]>(`/clinical/patients?dept=${encodeURIComponent(dept)}`),
  getClinicalFollowUps: (dept: string) =>
    request<any[]>(`/clinical/followups?dept=${encodeURIComponent(dept)}`),

  // ═══════════════════════════════════════════════════════
  // NEW: Patient accounts, session saving, approvals
  // ═══════════════════════════════════════════════════════

  // Patient registration & login (name + phone)
  patientRegister: (data: { name: string; phone: string; age?: number; gender?: string }) =>
    request<{ success: boolean; patient?: PatientAccount; message?: string; error?: string }>('/patient/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patientLogin: (name: string, phone: string) =>
    request<{ success: boolean; patient?: PatientAccount; error?: string }>('/patient/login', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    }),

  // Patient visit history
  getPatientHistory: (patientId: string) =>
    request<any[]>(`/patient/${patientId}/history`),

  // Link session to patient account (save conversation)
  saveSessionToPatient: (sessionId: string, patientId: string) =>
    request<{ success: boolean }>(`/sessions/${sessionId}/save-to-patient`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    }),

  // Admin approval workflow
  approveSession: (sessionId: string, status: 'approved' | 'rejected') =>
    request<{ success: boolean }>(`/sessions/${sessionId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Doctor change password
  changeDoctorPassword: (doctorId: string, currentPassword: string, newPassword: string) =>
    request<{ success: boolean; error?: string }>('/doctor/change-password', {
      method: 'POST',
      body: JSON.stringify({ doctorId, currentPassword, newPassword }),
    }),

  // Database stats
  getDbStats: () => request<DbStats>('/db/stats'),

  // Clinical aggregate stats (for admin dashboard)
  getClinicalStats: () => request<{
    totalEmergencies: number; totalAppointments: number;
    totalPatientCards: number; totalFollowUps: number;
    checkedIn: number; waiting: number;
  }>('/clinical/stats'),

  // Sessions routed to a specific department (for doctor portal)
  getSessionsByDepartment: (dept: string) =>
    request<any[]>(`/sessions/by-department?dept=${encodeURIComponent(dept)}`),
};
