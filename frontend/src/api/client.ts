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
};
