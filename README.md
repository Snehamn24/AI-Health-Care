# CareAssist — AI-Powered Healthcare Patient Intake & Triage

**An AI-powered cloud-native healthcare intake and triage orchestration system built using Google Cloud GenAI infrastructure.**

Patients speak or type symptoms naturally; CareAssist conducts conversational onboarding, symptom understanding, hybrid triage, department routing, and clinician handoff generation—with data stored in Firestore, semantic retrieval via Pinecone, and analytics in BigQuery/Looker Studio.

## Architecture

```
Patient Voice/Text → Speech-to-Text → Gemini Analysis → Clarifying Questions
→ Structured Extraction → Embeddings → Pinecone RAG → Hybrid Triage
→ Department Routing → Clinician Handoff → Firestore → BigQuery → Looker Studio
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, TypeScript |
| AI | Gemini / Vertex AI, embeddings, RAG |
| Vector DB | Pinecone |
| GCP | Cloud Run, Firestore, BigQuery, Speech-to-Text, Text-to-Speech |
| Analytics | BigQuery + Looker Studio |

## Quick Start (Demo Mode)

Demo mode runs without GCP credentials using intelligent local fallbacks for Gemini, Firestore, Pinecone, and Speech.

```bash
# Terminal 1 — API
cd backend
cp .env.example .env
npm install
npm run dev

# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Demo conversation flow

1. **Registration:** "My name is Alex Rivera, I'm 52, male. I have hypertension and take lisinopril. No allergies."
2. **Symptoms:** "I have chest pain and shortness of breath for 2 days with sweating"
3. View **triage panel** (Emergency / Cardiology) and **clinician handoff**
4. Open **Analytics** and **Architecture** tabs

## Production Setup

1. **GCP:** Enable Vertex AI, Firestore, BigQuery, Speech, Text-to-Speech APIs.
2. **Service account** with roles: `aiplatform.user`, `datastore.user`, `bigquery.dataEditor`, `cloudspeech.client`.
3. **Pinecone:** Create index (384 dimensions for demo hash / 768 for `text-embedding-004`), run `npm run seed:pinecone`.
4. **Environment:** Set `DEMO_MODE=false` and configure `.env` from `.env.example`.
5. **Deploy API:** `gcloud builds submit --config=infrastructure/cloudbuild.yaml`
6. **BigQuery:** Run `infrastructure/bigquery-schema.sql`
7. **Looker:** Follow `infrastructure/looker-studio-setup.md`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health + demo mode flag |
| POST | `/api/sessions` | Start intake session |
| POST | `/api/sessions/:id/message` | Send patient message |
| POST | `/api/speech/transcribe` | Speech-to-Text |
| POST | `/api/speech/synthesize` | Text-to-Speech |
| GET | `/api/analytics/summary` | Dashboard metrics |
| GET | `/api/workflow/explain/:id` | Explainable AI steps |

## Hybrid Triage (Safety-First)

1. **Deterministic red-flag rules** — chest pain + sweating, stroke FAST, suicidal ideation, etc.
2. **Gemini reasoning** — symptom context and department suggestion
3. **RAG** — Pinecone retrieval of clinical guidelines
4. **Safety validation** — over-triage policy elevates urgency when rules conflict with LLM

## Project Structure

```
healthcare-intake-triage/
├── backend/          # Express API, Gemini, triage, RAG, GCP services
├── frontend/         # React patient intake UI + analytics
├── infrastructure/   # BigQuery, Cloud Build, Looker docs
└── README.md
```

## Disclaimer

This system is for **education and demonstration** of GenAI healthcare architecture. It is not a medical device and does not provide clinical diagnosis. Always involve licensed clinicians for patient care decisions.
