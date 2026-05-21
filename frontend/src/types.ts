export type UrgencyLevel = 'emergency' | 'urgent' | 'high' | 'medium' | 'low';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface DoctorSuggestion {
  doctorId: string;
  doctorName: string;
  specialty: string;
  department: string;
  floor: number;
  room: string;
  hospitalLocation: string;
  appointmentTime: string;
  infoSentToDoctor: boolean;
}

export interface IntakeSession {
  id: string;
  patientId: string;
  phase: string;
  profile: Record<string, any>;
  symptoms: { symptoms: string[]; duration?: string; severity?: string };
  messages: ChatMessage[];
  structuredIntake?: {
    symptoms: string[];
    duration?: string;
    severity: string;
    recommended_department: string;
    urgency: UrgencyLevel;
    possible_concerns: string[];
    red_flags_detected: string[];
  };
  triage?: {
    urgency: UrgencyLevel;
    department: string;
    redFlags: string[];
    reasoning: string;
    safetyOverride: boolean;
  };
  clinicianHandoff?: {
    summary: string;
    symptoms: string[];
    severity: string;
    possibleConcerns: string[];
    recommendedActions: string[];
    department: string;
    urgency: UrgencyLevel;
  };
  doctorSuggestion?: DoctorSuggestion;
  treatmentPlan?: string[];
  fieldsCollected: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalCases: number;
  emergencyPercentage: number;
  departmentDistribution: Record<string, number>;
  symptomFrequency: Record<string, number>;
  severityBreakdown: Record<string, number>;
  trafficByDay: Record<string, number>;
}

export interface WorkflowExplain {
  title: string;
  steps: Array<{ step: number; name: string; status: string; detail?: unknown }>;
}
