# CareAssist — AI-Powered Healthcare Intake & Triage Portal

> **An AI-driven clinical intake system combining deterministic NLP safety rules, vector-based RAG retrieval, and Google Gemini LLM reasoning to automate patient triage and department routing.**

---

## What is CareAssist?

CareAssist is a full-stack, cloud-ready healthcare intake and triage platform. Patients interact with a conversational AI assistant that collects symptoms, detects emergencies in real time, retrieves clinical guidelines through RAG, and routes them to the correct hospital department — all before a human clinician even opens a file.

The platform supports **three synchronized dashboards**:
- 🧑‍⚕️ **Patient Portal** — submit symptoms via AI chat, view visit history and Doctor Reviewed status
- 👨‍⚕️ **Doctor Portal** — department-scoped clinical queue, handoff notes, treatment plans, Mark as Viewed
- 🏥 **Admin Dashboard** — full session oversight, approval workflow, doctor registry, department management

---

## Problem Statement

Hospital triage is traditionally manual, slow, and error-prone. A receptionist handling multiple patients simultaneously may fail to catch:
- Life-threatening emergencies buried in vague language (e.g. *"I feel unwell"* masking hematemesis)
- Incorrect department routing leading to delayed specialist care
- No structured handoff to the receiving clinician

CareAssist solves all three problems with an AI pipeline that is **fast, consistent, and safety-first**.

---

## System Architecture — 4-Layer AI Pipeline

```
[ Patient Types a Message ]
           │
           ▼
┌─────────────────────────────────────────────┐
│  LAYER 1 — NLP Red-Flag Rule Engine          │  red-flag-rules.ts
│  Deterministic regex scan — runs FIRST       │  (zero AI dependency)
│  14 patterns: hematemesis, stroke, ACS...    │
└──────────┬──────────────────────────────────┘
           │
    Emergency? ──YES──► Safety Override → Emergency Care (instant)
           │
          NO
           ▼
┌─────────────────────────────────────────────┐
│  LAYER 2 — RAG Retrieval                     │  rag.ts + pinecone.ts
│  Query embedded → cosine similarity search   │  clinical-guidelines.json
│  Top 3 clinical protocols retrieved          │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  LAYER 3 — Gemini LLM Reasoning              │  gemini.ts
│  RAG context injected into prompt            │
│  Symptom analysis + structured extraction    │
│  Department routing + confidence score       │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  LAYER 4 — Safety Validation                 │  triage.ts
│  Rule urgency vs LLM urgency compared        │
│  Over-triage policy: always pick higher      │
│  Final: urgency + department + reasoning     │
└──────────┬──────────────────────────────────┘
           │
           ▼
[ SQLite persistence ] → [ Doctor notified ] → [ Admin approves ] → [ Patient sees Dr. Reviewed badge ]
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18 + TypeScript + Vite | Type-safe SPA with fast HMR dev server |
| Frontend Routing | React Router v6 | Client-side navigation across 5 pages |
| Styling | Vanilla CSS + Tailwind utilities | Glassmorphism, dark mode, animations |
| Icons | Lucide React | Clinical UI iconography |
| Backend Runtime | Node.js + Express + TypeScript | REST API server on port 8080 |
| Database | SQLite via `better-sqlite3` | Local ACID-compliant persistent storage |
| Primary AI | Google Gemini (`gemini-2.0-flash`) | Conversational NLU + triage + handoff generation |
| Enterprise AI | Google Cloud Vertex AI | Production Gemini endpoint (when `GOOGLE_CLOUD_PROJECT` set) |
| Vector Store | Pinecone (prod) / In-memory cosine (demo) | RAG semantic similarity search |
| Embeddings | Google Embedding API / Gemini | Clinical text vectorization |
| NLP Safety | Custom Regex Rule Engine | Deterministic emergency detection |
| RAG Knowledge | `clinical-guidelines.json` | 15 curated medical protocols |
| Unique IDs | `uuid` (v4) | Session and patient ID generation |
| Build | `tsc` + Vite | TypeScript compilation + production bundling |

---

## URL Routes

| Page | URL | Access |
|------|-----|--------|
| Home Portal | `http://localhost:5173/` | Public |
| AI Intake Chat | `http://localhost:5173/intake` | Public |
| Admin Dashboard | `http://localhost:5173/dashboard` | Admin login required |
| Doctor Portal | `http://localhost:5173/doctor-portal` | Doctor login required |
| Patient Portal | `http://localhost:5173/patient-portal` | Phone number login |

---

## Complete File Reference

### Backend (`backend/src/`)

| File | Size | Role |
|------|------|------|
| `index.ts` | 33 lines | Express server entry — seeds DB on startup, attaches CORS and routes |
| `config.ts` | 31 lines | Reads all env vars — Gemini API key, demo mode, Pinecone, port |
| `routes/api.ts` | 529 lines | All REST endpoints: sessions, patients, doctors, triage, admin, mark-viewed |
| `services/intake-orchestrator.ts` | 469 lines | **Main pipeline** — orchestrates NLP → RAG → Gemini → persistence |
| `services/gemini.ts` | 458 lines | Gemini API calls + regex-based demo fallbacks |
| `services/red-flag-rules.ts` | 156 lines | **NLP Layer 1** — 14 regex patterns for emergency detection |
| `services/triage.ts` | 101 lines | **Hybrid triage** — merges rule engine + RAG + LLM into final decision |
| `services/rag.ts` | 46 lines | RAG orchestrator — calls Pinecone, builds `RAGContext` object |
| `services/pinecone.ts` | 158 lines | Vector store — Pinecone in prod, in-memory cosine similarity in demo |
| `services/embeddings.ts` | ~50 lines | Embeds clinical text using Google Embedding API |
| `services/database.ts` | 341 lines | SQLite schema, all queries, `doctor_viewed` migration |
| `services/firestore.ts` | 111 lines | `IntakeSession` ↔ `DbSession` conversion layer (SQLite adapter, NOT Firebase) |
| `services/doctors.ts` | 209 lines | Doctor registry, credential validation, availability management |
| `services/seed-dataset.ts` | 193 lines | Seeds 12 departments, 12 doctors, 50+ patients, 15 sessions |
| `services/clinical-records.ts` | 470 lines | Clinical history and patient record retrieval helpers |
| `services/bigquery.ts` | ~115 lines | Intake event logging (BigQuery in prod, no-op in demo) |
| `services/speech.ts` | ~47 lines | Speech-to-text stub (future voice intake) |
| `data/clinical-guidelines.json` | 213 lines | **RAG knowledge base** — 15 medical protocols |
| `types/index.ts` | — | Shared types: `Department`, `UrgencyLevel`, `IntakeSession`, `TriageResult` |

### Frontend (`frontend/src/`)

| File | Role |
|------|------|
| `App.tsx` | Router — 5 routes mapped to pages |
| `pages/HomePortalPage.tsx` | Landing page |
| `pages/IntakePage.tsx` | AI chat intake — sends messages to `/api/chat` |
| `pages/DoctorDashboardPage.tsx` | Clinical queue, handoff modal, Mark as Viewed button |
| `pages/DashboardPage.tsx` | Admin: routing requests, departments, doctors, analytics |
| `pages/PatientPortalPage.tsx` | Phone login + visit history + Doctor Reviewed badge |
| `components/ChatPanel.tsx` | Chat bubble UI component |
| `components/TriagePanel.tsx` | Real-time triage result display |
| `components/LoginGate.tsx` | Role-based auth gate (doctor/admin) |
| `components/AdminConsole.tsx` | Admin management sub-components |
| `api/client.ts` | Typed HTTP client — all `fetch` calls to backend |
| `types.ts` | Frontend-specific TypeScript type definitions |

---

## How the AI Works — Step by Step

### Step 1: Patient Registration (NLP + AI Extraction)

`intake-orchestrator.ts` → `extractProfileDetailsWithAI()` + `extractRegistrationFields()`

The AI collects: name, age, gender, existing conditions, medications, allergies.

- **AI method**: Gemini extracts profile fields from free-text (e.g. *"I'm Priya, 28, female"*)
- **Regex fallback**: Pattern matching for age numbers, gender keywords, skip phrases
- **Smart skip**: If patient says *"skip"*, *"none"*, *"no medications"* → all optional fields marked collected
- **Emergency fast-track**: If emergency symptoms detected during registration, optional fields are auto-filled empty and patient goes straight to triage

### Step 2: NLP Red-Flag Scan (Layer 1 — runs on EVERY message)

`red-flag-rules.ts` → `evaluateRedFlags(text, symptoms)`

```typescript
// Example: Multi-pattern ACS detection
{
  patterns: [/chest\s*pain/i, /(sweat|sweating|diaphoresis)/i],
  flag: 'chest_pain_with_sweating',
  urgency: 'emergency',
  department: 'Emergency Care',
  reason: 'May indicate acute coronary syndrome'
}
```

- Scans combined patient text + extracted symptoms
- Single-pattern rules: ONE regex must match
- Multi-pattern rules: ALL regex patterns must match (AND logic)
- Returns matches sorted by urgency rank: `emergency(5) > urgent(4) > high(3) > medium(2) > low(1)`
- If ANY `emergency` flag fires → safety override, routing bypasses Gemini

**14 Red-Flag Patterns Detected:**

| Pattern | Urgency | Routes To |
|---------|---------|-----------|
| Chest pain + sweating | Emergency | Emergency Care |
| Severe dyspnea (can't breathe, gasping) | Emergency | Emergency Care |
| Stroke FAST (facial droop, slurred speech) | Emergency | Emergency Care |
| Suicidal ideation | Emergency | Psychiatry |
| Thunderclap headache | Emergency | Emergency Care |
| Unconscious / seizure | Emergency | Emergency Care |
| Anaphylaxis (throat closing) | Emergency | Emergency Care |
| Hematemesis / vomiting blood | Emergency | Emergency Care |
| Severe acute abdomen (rigid) | Emergency | Emergency Care |
| Overdose / poisoning | Emergency | Emergency Care |
| Chest pain + difficulty breathing | Urgent | Cardiology |
| High fever + confusion | Urgent | General Medicine |
| Chest pain (alone) | High | Cardiology |
| Breathing difficulty (moderate) | High | Emergency Care |

### Step 3: RAG Retrieval (Layer 2)

`rag.ts` → `retrieveClinicalContext(symptomQuery)`  
`pinecone.ts` → `searchClinicalContext(query, topK=3)`

**In production (Pinecone API key set):**
1. Patient query text is embedded using Google Embedding API → dense vector
2. Pinecone vector store queried with cosine similarity
3. Top 3 matching clinical protocols retrieved

**In demo mode (no Pinecone key):**
1. Same embedding generated
2. In-memory `Map` used as local vector store
3. Cosine similarity calculated manually: `dot(a,b) / (|a| × |b|)`

**Output — `RAGContext` object:**
```typescript
{
  contextText: "[1] chest pain (Cardiology): Chest pain may indicate cardiac ischemia...",
  clarifyingQuestions: ["Are you experiencing shortness of breath?", ...],
  relatedDepartments: ["Cardiology", "Emergency Care"],
  redFlagHints: ["chest pain with sweating", "radiating arm pain"],
  sources: ["chest-pain-001"]
}
```

This `contextText` is injected directly into the Gemini prompts for grounded reasoning.

### Step 4: Gemini LLM Analysis (Layer 3)

`gemini.ts` — three sequential AI calls:

**4a. Symptom Analysis**
```
Prompt: "Analyze patient message for symptoms. Profile: {...} History: {...}
         Return JSON: { symptoms, severity, intent, suggestedQuestions }"
```

**4b. Structured Intake Extraction** (RAG context injected)
```
Prompt: "RAG clinical context: [contextText from Step 3]
         Extract structured intake. Recommend department from:
         General Medicine, Cardiology, Neurology, Orthopedics,
         Pulmonology, Dermatology, ENT, Psychiatry, Emergency Care
         Return JSON: { symptoms, duration, severity, recommended_department, possible_concerns }"
```

**4c. Hybrid Triage** (`triage.ts`)
```
runHybridTriage():
  1. evaluateRedFlags() → rule-based urgency
  2. retrieveClinicalContext() → RAG department hints
  3. llmTriageAssessment() → Gemini urgency + department + confidence
  4. Safety merge: always pick higher urgency (over-triage policy)
  5. Return: TriageResult { urgency, department, redFlags, reasoning, safetyOverride }
```

**4d. Clinician Handoff Note Generation**
```
generateClinicianHandoff() → structured summary for the doctor:
  { summary, symptoms, severity, possibleConcerns, recommendedActions }
```

**Demo Mode Fallbacks** (when no API key set or `DEMO_MODE=true`):
- `demoSymptomAnalysis()` — regex matches hematemesis, chest pain, headache etc.
- `demoTriageLLM()` — pattern-based department mapping (emergency patterns checked first)
- `demoStructuredIntake()` — keyword-to-department mapping table

### Step 5: Doctor Assignment

`doctors.ts` → `getDoctorForDepartment(department)`  
`doctors.ts` → `generateAppointment(urgency)`

- Looks up the registered doctor for the triaged department
- Generates appointment time:
  - `emergency` → *"Immediate — Proceed directly to Emergency Pavilion"*
  - `urgent` → *"Priority Walk-in — Est. wait < 15 mins"*
  - Other → current time + 30 minutes

---

## How RAG Works — Deep Dive

**RAG = Retrieval-Augmented Generation**

Without RAG, Gemini can hallucinate departments or give generic advice. RAG grounds responses in real clinical protocols.

### The Clinical Knowledge Base

**File:** `backend/src/data/clinical-guidelines.json` — 15 protocols:

| ID | Symptom | Department | Red Flags |
|----|---------|-----------|-----------|
| chest-pain-001 | chest pain | Cardiology | radiating arm pain, sweating |
| stroke-001 | facial droop, slurred speech | Emergency Care | FAST positive |
| breathing-001 | shortness of breath | Pulmonology | blue lips, unable to speak |
| mental-health-001 | anxiety, depression, suicidal | Psychiatry | active suicidal ideation |
| abdominal-pain-001 | abdominal pain, nausea | General Medicine | vomiting blood, rigid abdomen |
| pediatric-fever-001 | child fever, lethargy | General Medicine | infant with fever |
| eye-injury-001 | eye pain, vision loss | General Medicine | sudden vision loss, chemical splash |
| headache-001 | headache | Neurology | thunderclap, vision loss |
| fever-001 | fever | General Medicine | fever + stiff neck |
| ortho-001 | joint pain, fracture | Orthopedics | open fracture, no pulse |
| ent-001 | sore throat, ear pain | ENT | stridor, drooling |
| skin-001 | rash, itching | Dermatology | rash + facial swelling |
| uti-pain-001 | burning urination | General Medicine | fever + flank pain |
| pregnancy-bleeding-001 | pregnant + bleeding | General Medicine | sharp lower abdominal pain |
| allergic-reaction-001 | hives, swelling | Dermatology | throat tightness |

### RAG vs Pure LLM

| Without RAG | With RAG |
|-------------|----------|
| Gemini may hallucinate wrong department | Grounded in 15 curated clinical protocols |
| Generic clarifying questions | Condition-specific questions (e.g. "Does pain radiate to your arm?") |
| No red flag awareness | Explicit red flags injected from knowledge base |
| Inconsistent urgency scoring | Deterministic retrieval + safety validation layer |

---

## Database Schema (SQLite — `backend/healthcare.db`)

### `sessions` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID session identifier |
| `patient_id` | TEXT | Linked registered patient |
| `phase` | TEXT | greeting / registration / symptoms / clarification / triage / complete |
| `profile_json` | TEXT | Patient name, age, gender, conditions, medications, allergies |
| `symptoms_json` | TEXT | Extracted symptoms, severity, duration |
| `messages_json` | TEXT | Full conversation history |
| `structured_intake_json` | TEXT | AI-extracted structured intake |
| `triage_json` | TEXT | Urgency, department, red flags, reasoning |
| `clinician_handoff_json` | TEXT | Doctor-facing summary and actions |
| `doctor_suggestion_json` | TEXT | Assigned doctor name, room, appointment |
| `treatment_plan_json` | TEXT | AI-generated treatment pathway |
| `approval_status` | TEXT | pending / approved / rejected |
| `doctor_viewed` | INTEGER | 0 = not viewed, 1 = viewed by doctor |
| `doctor_viewed_at` | TEXT | ISO timestamp of when doctor viewed |
| `created_at` | TEXT | Session creation time |
| `updated_at` | TEXT | Last update time |

### Other tables
- **`patients`** — name, phone, age, gender, conditions, medications, allergies
- **`doctors`** — name, department, specialty, floor, room, hospital_location, username, password, availability_status
- **`departments`** — 12 clinical departments
- **`admin_settings`** — admin password and system config

---

## Role-Based Access Control

| Role | Login | Access Scope |
|------|-------|-------------|
| Patient | Phone number | Personal intake sessions only |
| Doctor | username + password | Department-scoped patient queue only |
| Admin | `admin` + `admin123` | All sessions, all doctors, all departments |

**Doctor credentials (from seed data):**

| Username | Password | Department |
|----------|----------|-----------|
| sarah | password | Cardiology |
| alan | password | Neurology |
| marcus | password | Orthopedics |
| elizabeth | password | Pulmonology |
| gregory | password | Dermatology |
| fiona | password | ENT |
| sigmund | password | Psychiatry |
| john | password | Emergency Care |
| robert | password | General Medicine |
| emily | password | Pediatrics |
| michael | password | Gastroenterology |
| fox | password | Oncology |

---

## Environment Configuration

**File:** `backend/.env`

```env
PORT=8080
DEMO_MODE=true
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — leave blank to run in demo mode
GOOGLE_CLOUD_PROJECT=
GCP_LOCATION=us-central1
PINECONE_API_KEY=
PINECONE_INDEX=healthcare-clinical-context
PINECONE_NAMESPACE=clinical-guidelines
```

**Mode logic:**
- `DEMO_MODE=true` or no `GOOGLE_CLOUD_PROJECT` → uses demo fallbacks + in-memory vector store
- `GEMINI_API_KEY` set → uses Gemini API via `@google/generative-ai`
- `GOOGLE_CLOUD_PROJECT` set → uses Vertex AI endpoint
- `PINECONE_API_KEY` set → uses Pinecone for vector search; otherwise uses in-memory cosine similarity

---

## Installation & Running

### Prerequisites
- Node.js v18+
- npm

### Setup

```bash
git clone https://github.com/Snehamn24/healthcare-intake-triage.git
cd healthcare-intake-triage

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### Configure environment
```bash
# backend/.env already has a Gemini API key
# Edit PORT or other settings as needed
```

### Run

```bash
# Terminal 1 — Backend API (port 8080)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### Build for production

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

---

## Live Demo Script (8 Steps)

| # | Action | Page | What happens |
|---|--------|------|-------------|
| 1 | Click **Intake** in nav | `/intake` | New session created, AI greeting appears |
| 2 | Type: *"I'm Priya, 28, female"* | Intake | Name/age/gender extracted by AI + regex |
| 3 | Type: *"I have been vomiting blood since morning"* | Intake | Hematemesis red flag fires → Emergency Care routing |
| 4 | Show triage panel | Intake | `urgency: emergency`, `department: Emergency Care`, red flags listed |
| 5 | Login as `john` / `password` | `/doctor-portal` | Dr. John Carter (Emergency Care) dashboard loads |
| 6 | Click on session, open handoff modal | Doctor Portal | AI-generated clinical summary + patient details |
| 7 | Click **Mark as Viewed** | Doctor Portal | Teal badge appears; DB updated with timestamp |
| 8 | Login as `admin` / `admin123` | `/dashboard` | Session shows **"Dr. Viewed"** teal badge in routing requests |

---

## Key Features Summary

### ✅ Implemented & Working
- Conversational AI intake with profile + symptom extraction
- 14-pattern deterministic NLP red-flag engine
- 4-layer hybrid triage (rules → RAG → LLM → safety validation)
- Vector-based RAG with Pinecone (prod) + in-memory cosine (demo)
- 15-entry clinical knowledge base
- Google Gemini integration with Vertex AI fallback
- Full offline demo mode with regex fallbacks
- Mark as Viewed — synchronized across all 3 dashboards
- Doctor department scoping
- Admin approval/rejection workflow
- 50+ seeded patient dataset
- 12 seeded doctors across all departments
- SQLite with automatic migrations

### 🔮 Future Enhancements
- Multilingual symptom analysis
- Voice intake (speech-to-text — `speech.ts` stub ready)
- Wearable device vitals integration
- EHR system integration
- Predictive readmission risk modeling
- BigQuery analytics dashboard (`bigquery.ts` integration ready)

---

## Viewing the Database

Your database is stored locally at `backend/healthcare.db` (SQLite).

**Option 1 — DB Browser for SQLite** (recommended for presentation):
1. Download: https://sqlitebrowser.org/dl/
2. Open `backend/healthcare.db`
3. Click "Browse Data" → select table

**Option 2 — VS Code Extension:**
Install "SQLite Viewer" by Florian Klampfer → right-click `healthcare.db` → Open With SQLite Viewer

**Option 3 — Command line:**
```bash
sqlite3 backend/healthcare.db ".tables"
sqlite3 backend/healthcare.db "SELECT id, approval_status, doctor_viewed FROM sessions;"
```

---

## Developer

**Sneha M N**  
AI Healthcare Intake & Triage Platform — CareAssist  
Built with React 18, Node.js, SQLite, Google Gemini 2.0 Flash, Pinecone RAG, TypeScript

---

*CareAssist — Safety-first AI triage. Grounded by RAG. Traceable across every workflow.*
