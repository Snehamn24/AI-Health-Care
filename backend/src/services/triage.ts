import type { Department, TriageResult, UrgencyLevel } from '../types/index.js';
import { evaluateRedFlags, mergeUrgency } from './red-flag-rules.js';
import { llmTriageAssessment } from './gemini.js';
import { retrieveClinicalContext } from './rag.js';

const DEPARTMENTS: Department[] = [
  'General Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pulmonology',
  'Dermatology',
  'ENT',
  'Psychiatry',
  'Emergency Care',
];

export async function runHybridTriage(
  conversationText: string,
  symptoms: string[]
): Promise<TriageResult> {
  // Layer 1: Deterministic red-flag rules
  const redFlagMatches = evaluateRedFlags(conversationText, symptoms);
  const topRedFlag = redFlagMatches[0];

  // Layer 2: RAG context for department hints
  const rag = await retrieveClinicalContext(symptoms.join(' '));

  // Layer 3: Gemini reasoning
  const llm = await llmTriageAssessment(
    symptoms,
    conversationText,
    redFlagMatches.map((r) => r.flag)
  );

  let urgency: UrgencyLevel = llm.urgency;
  let department: Department = normalizeDepartment(llm.department);
  let safetyOverride = false;

  // Layer 4: Safety validation — prefer over-triage
  if (topRedFlag) {
    const ruleUrgency = topRedFlag.urgency;
    if (
      urgencyRank(ruleUrgency) > urgencyRank(urgency) ||
      (ruleUrgency === 'emergency' && urgency !== 'emergency')
    ) {
      urgency = ruleUrgency;
      safetyOverride = true;
    }
    if (topRedFlag.department) {
      department = topRedFlag.department;
      safetyOverride = true;
    }
  }

  // RAG department hint if LLM chose general but RAG suggests specialist
  if (department === 'General Medicine' && rag.relatedDepartments[0]) {
    const ragDept = normalizeDepartment(rag.relatedDepartments[0]);
    if (ragDept !== 'General Medicine') department = ragDept;
  }

  urgency = mergeUrgency(urgency, topRedFlag?.urgency || 'low');

  const reasoning = [
    topRedFlag ? `Rule engine: ${topRedFlag.reason}` : null,
    `LLM: ${llm.reasoning}`,
    safetyOverride ? 'Safety validation elevated priority (over-triage policy).' : null,
    `RAG sources: ${rag.sources.join(', ') || 'none'}`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    urgency,
    department,
    redFlags: redFlagMatches.map((r) => r.flag),
    reasoning,
    safetyOverride,
    deterministicScore: redFlagMatches.length > 0 ? 1 : 0,
    llmConfidence: llm.confidence,
  };
}

function normalizeDepartment(d: string): Department {
  const found = DEPARTMENTS.find(
    (dept) => dept.toLowerCase() === d.toLowerCase() || d.toLowerCase().includes(dept.toLowerCase())
  );
  return found || 'General Medicine';
}

function urgencyRank(u: UrgencyLevel): number {
  const ranks: Record<UrgencyLevel, number> = {
    emergency: 5,
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return ranks[u];
}
