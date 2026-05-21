import { BigQuery } from '@google-cloud/bigquery';
import { config } from '../config.js';
import type { AnalyticsEvent } from '../types/index.js';

const memoryEvents: AnalyticsEvent[] = [];

let bigquery: BigQuery | null = null;

function getClient(): BigQuery | null {
  if (config.demoMode && !process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  if (!bigquery) bigquery = new BigQuery({ projectId: config.gcp.projectId });
  return bigquery;
}

export async function insertIntakeEvent(event: AnalyticsEvent): Promise<void> {
  memoryEvents.push(event);

  const client = getClient();
  if (!client) return;

  try {
    await client
      .dataset(config.bigquery.dataset)
      .table(config.bigquery.table)
      .insert([event]);
  } catch (err) {
    console.warn('BigQuery insert failed (table may not exist):', (err as Error).message);
  }
}

export async function getAnalyticsSummary(): Promise<{
  totalCases: number;
  emergencyPercentage: number;
  departmentDistribution: Record<string, number>;
  symptomFrequency: Record<string, number>;
  severityBreakdown: Record<string, number>;
  trafficByDay: Record<string, number>;
}> {
  const events = memoryEvents.length ? memoryEvents : await fetchFromBigQuery();

  const total = events.length || 1;
  const emergencyCount = events.filter((e) => e.is_emergency).length;

  const deptDist: Record<string, number> = {};
  const symptomFreq: Record<string, number> = {};
  const severity: Record<string, number> = {};
  const traffic: Record<string, number> = {};

  for (const e of events) {
    deptDist[e.department] = (deptDist[e.department] || 0) + 1;
    severity[e.severity] = (severity[e.severity] || 0) + 1;
    const day = e.created_at.split('T')[0];
    traffic[day] = (traffic[day] || 0) + 1;
    for (const s of e.symptoms) {
      symptomFreq[s] = (symptomFreq[s] || 0) + 1;
    }
  }

  return {
    totalCases: events.length,
    emergencyPercentage: Math.round((emergencyCount / total) * 1000) / 10,
    departmentDistribution: deptDist,
    symptomFrequency: sortTop(symptomFreq, 10),
    severityBreakdown: severity,
    trafficByDay: traffic,
  };
}

async function fetchFromBigQuery(): Promise<AnalyticsEvent[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const [rows] = await client.query({
      query: `
        SELECT session_id, patient_id, symptoms, urgency, department,
               is_emergency, severity, created_at
        FROM \`${config.gcp.projectId}.${config.bigquery.dataset}.${config.bigquery.table}\`
        ORDER BY created_at DESC
        LIMIT 500
      `,
    });
    return rows as AnalyticsEvent[];
  } catch {
    return memoryEvents;
  }
}

function sortTop(obj: Record<string, number>, n: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
  );
}

// Seed demo analytics
export function seedDemoAnalytics(): void {
  if (memoryEvents.length > 0) return;
  const samples: AnalyticsEvent[] = [
    {
      session_id: 'demo-1',
      patient_id: 'p1',
      symptoms: ['chest pain', 'shortness of breath'],
      urgency: 'emergency',
      department: 'Emergency Care',
      is_emergency: true,
      severity: 'high',
      created_at: new Date().toISOString(),
    },
    {
      session_id: 'demo-2',
      patient_id: 'p2',
      symptoms: ['fever', 'cough'],
      urgency: 'medium',
      department: 'General Medicine',
      is_emergency: false,
      severity: 'medium',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      session_id: 'demo-3',
      patient_id: 'p3',
      symptoms: ['headache', 'dizziness'],
      urgency: 'high',
      department: 'Neurology',
      is_emergency: false,
      severity: 'high',
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      session_id: 'demo-4',
      patient_id: 'p4',
      symptoms: ['joint pain'],
      urgency: 'medium',
      department: 'Orthopedics',
      is_emergency: false,
      severity: 'medium',
      created_at: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      session_id: 'demo-5',
      patient_id: 'p5',
      symptoms: ['rash'],
      urgency: 'low',
      department: 'Dermatology',
      is_emergency: false,
      severity: 'low',
      created_at: new Date(Date.now() - 345600000).toISOString(),
    },
  ];
  memoryEvents.push(...samples);
}

seedDemoAnalytics();
