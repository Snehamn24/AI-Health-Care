import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  demoMode: process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_CLOUD_PROJECT,
  gcp: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'demo-project',
    location: process.env.GCP_LOCATION || 'us-central1',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  firestore: {
    patients: process.env.FIRESTORE_COLLECTION_PATIENTS || 'patients',
    sessions: process.env.FIRESTORE_COLLECTION_SESSIONS || 'intake_sessions',
  },
  bigquery: {
    dataset: process.env.BIGQUERY_DATASET || 'healthcare_analytics',
    table: process.env.BIGQUERY_TABLE || 'intake_events',
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    index: process.env.PINECONE_INDEX || 'healthcare-clinical-context',
    namespace: process.env.PINECONE_NAMESPACE || 'clinical-guidelines',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
