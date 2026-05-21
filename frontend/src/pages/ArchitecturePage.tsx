const STEPS = [
  'Patient Voice/Text Input',
  'Speech-to-Text Conversion',
  'Gemini Symptom Analysis',
  'Clarifying Question Generation',
  'Structured Data Extraction',
  'Embedding Generation',
  'Pinecone Vector Search',
  'Context Retrieval (RAG)',
  'Hybrid Triage Logic',
  'Department Routing',
  'Clinician Handoff Note Generation',
  'Firestore Storage',
  'BigQuery Analytics',
  'Looker Dashboard Visualization',
];

const FEATURES = [
  'Conversational AI onboarding',
  'Multi-step Gemini reasoning',
  'Dynamic clarifying questions',
  'Retrieval-Augmented Generation',
  'Hybrid deterministic + LLM triage',
  'Safety guardrails (over-triage policy)',
  'Semantic search via Pinecone',
  'Session memory in Firestore',
  'Speech-to-Text & Text-to-Speech',
  'Explainable workflow visualization',
];

export default function ArchitecturePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h2 className="font-display text-3xl font-bold text-care-900 mb-2">
        System Architecture
      </h2>
      <p className="text-slate-600 mb-8">
        An AI-powered cloud-native healthcare intake and triage orchestration system built using
        Google Cloud GenAI infrastructure.
      </p>

      <div className="glass rounded-2xl p-6 mb-8">
        <h3 className="font-semibold mb-4">End-to-End Workflow</h3>
        <div className="space-y-2">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-care-100 text-care-800 flex items-center justify-center text-sm font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 text-sm text-slate-700">{step}</div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block text-slate-300">↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Google Cloud Stack</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>Vertex AI / Gemini API — reasoning & extraction</li>
            <li>Cloud Speech-to-Text & Text-to-Speech</li>
            <li>Cloud Run — API deployment</li>
            <li>Firestore — patients, sessions, handoffs</li>
            <li>BigQuery — analytics warehouse</li>
            <li>Looker Studio — dashboards</li>
          </ul>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">AI / Data Layer</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>Pinecone — clinical guideline vectors</li>
            <li>Embeddings — semantic symptom search</li>
            <li>RAG — contextual retrieval before triage</li>
            <li>Red-flag rules — deterministic safety layer</li>
            <li>React + TypeScript + Tailwind — patient UI</li>
          </ul>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 mt-6">
        <h3 className="font-semibold mb-3">Demonstrated Capabilities</h3>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="text-xs px-3 py-1.5 rounded-full bg-care-50 text-care-800 border border-care-100"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      <pre className="mt-8 p-4 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto">
{`┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React UI  │────▶│  Cloud Run   │────▶│   Gemini    │
│  Voice/Chat │     │  Express API │     │  Vertex AI  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐    ┌────────────┐    ┌────────────┐
   │ Firestore│    │  Pinecone  │    │  BigQuery  │
   │ sessions │    │  RAG ctx   │    │  analytics │
   └──────────┘    └────────────┘    └─────┬──────┘
                                           ▼
                                    ┌────────────┐
                                    │Looker Studio │
                                    └────────────┘`}
      </pre>
    </div>
  );
}
