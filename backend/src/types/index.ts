export type Department =
  | 'General Medicine'
  | 'Cardiology'
  | 'Neurology'
  | 'Orthopedics'
  | 'Pulmonology'
  | 'Dermatology'
  | 'ENT'
  | 'Psychiatry'
  | 'Emergency Care';

export type UrgencyLevel = 'emergency' | 'urgent' | 'high' | 'medium' | 'low';

export type IntakePhase =
  | 'greeting'
  | 'registration'
  | 'symptoms'
  | 'clarification'
  | 'triage'
  | 'complete';

export interface PatientProfile {
  name?: string;
  age?: number;
  gender?: string;
  existingConditions?: string[];
  medications?: string[];
  allergies?: string[];
}

export interface SymptomData {
  symptoms: string[];
  duration?: string;
  severity?: string;
  description?: string;
}

export interface StructuredIntake {
  symptoms: string[];
  duration?: string;
  severity: string;
  recommended_department: Department;
  urgency: UrgencyLevel;
  possible_concerns: string[];
  red_flags_detected: string[];
}

export interface TriageResult {
  urgency: UrgencyLevel;
  department: Department;
  redFlags: string[];
  reasoning: string;
  safetyOverride: boolean;
  deterministicScore: number;
  llmConfidence: number;
}

export interface ClinicianHandoff {
  summary: string;
  symptoms: string[];
  severity: string;
  possibleConcerns: string[];
  recommendedActions: string[];
  department: Department;
  urgency: UrgencyLevel;
  generatedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface DoctorSuggestion {
  doctorId: string;
  doctorName: string;
  specialty: string;
  department: Department;
  floor: number;
  room: string;
  hospitalLocation: string;
  appointmentTime: string;
  infoSentToDoctor: boolean;
}

export interface IntakeSession {
  id: string;
  patientId: string;
  phase: IntakePhase;
  profile: PatientProfile;
  symptoms: SymptomData;
  messages: ChatMessage[];
  structuredIntake?: StructuredIntake;
  triage?: TriageResult;
  clinicianHandoff?: ClinicianHandoff;
  doctorSuggestion?: DoctorSuggestion;
  pendingQuestion?: string;
  treatmentPlan?: string[];
  fieldsCollected: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsEvent {
  session_id: string;
  patient_id: string;
  symptoms: string[];
  urgency: UrgencyLevel;
  department: Department;
  is_emergency: boolean;
  severity: string;
  created_at: string;
}
