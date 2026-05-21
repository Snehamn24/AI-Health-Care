import type { Department, UrgencyLevel } from '../types/index.js';

export interface RedFlagMatch {
  flag: string;
  urgency: UrgencyLevel;
  department?: Department;
  reason: string;
}

const RED_FLAG_PATTERNS: Array<{
  patterns: RegExp[];
  flag: string;
  urgency: UrgencyLevel;
  department?: Department;
  reason: string;
}> = [
  {
    patterns: [/chest\s*pain/i, /(sweat|sweating|diaphoresis)/i],
    flag: 'chest_pain_with_sweating',
    urgency: 'emergency',
    department: 'Emergency Care',
    reason: 'Chest pain with sweating may indicate acute coronary syndrome',
  },
  {
    patterns: [/can'?t\s*breathe|severe\s*(shortness|breath)|gasping|choking/i],
    flag: 'severe_dyspnea',
    urgency: 'emergency',
    department: 'Emergency Care',
    reason: 'Severe breathing difficulty requires immediate emergency care',
  },
  {
    patterns: [/facial\s*droop|slurred\s*speech|one\s*side\s*weak|arm\s*weakness|FAST/i],
    flag: 'stroke_symptoms',
    urgency: 'emergency',
    department: 'Emergency Care',
    reason: 'Possible stroke — time-critical emergency',
  },
  {
    patterns: [/suicidal|kill\s*myself|end\s*my\s*life|want\s*to\s*die/i],
    flag: 'suicidal_ideation',
    urgency: 'emergency',
    department: 'Psychiatry',
    reason: 'Suicidal ideation requires immediate psychiatric emergency assessment',
  },
  {
    patterns: [/worst\s*headache|thunderclap/i],
    flag: 'thunderclap_headache',
    urgency: 'emergency',
    department: 'Emergency Care',
    reason: 'Thunderclap headache may indicate subarachnoid hemorrhage',
  },
  {
    patterns: [/unconscious|passed\s*out|not\s*responding|seizure/i],
    flag: 'altered_consciousness',
    urgency: 'emergency',
    department: 'Emergency Care',
    reason: 'Altered consciousness requires emergency evaluation',
  },
  {
    patterns: [/anaphylaxis|throat\s*closing|tongue\s*swelling|lip\s*swelling.*breath/i],
    flag: 'anaphylaxis',
    urgency: 'emergency',
    department: 'Emergency Care',
    reason: 'Possible anaphylaxis — emergency treatment required',
  },
  {
    patterns: [/chest\s*pain/i, /short(ness)?\s*of\s*breath|difficulty\s*breathing/i],
    flag: 'chest_pain_with_dyspnea',
    urgency: 'urgent',
    department: 'Cardiology',
    reason: 'Chest pain with breathing difficulty — high priority cardiology review',
  },
  {
    patterns: [/(?:high\s*fever|fever.*(?:103|39\.5|40)|(?:103|39\.5|40).*fever)/i, /confus/i],
    flag: 'high_fever_neuro',
    urgency: 'urgent',
    department: 'General Medicine',
    reason: 'High fever with neurological symptoms',
  },
  {
    patterns: [/chest\s*pain/i],
    flag: 'chest_pain',
    urgency: 'high',
    department: 'Cardiology',
    reason: 'Chest pain warrants cardiology prioritization',
  },
  {
    patterns: [/difficulty\s*breathing|shortness\s*of\s*breath|dyspnea/i],
    flag: 'breathing_difficulty',
    urgency: 'high',
    department: 'Pulmonology',
    reason: 'Respiratory symptoms require pulmonology assessment',
  },
];

export function evaluateRedFlags(text: string, symptoms: string[]): RedFlagMatch[] {
  const combined = `${text} ${symptoms.join(' ')}`.toLowerCase();
  const matches: RedFlagMatch[] = [];
  const seen = new Set<string>();

  for (const rule of RED_FLAG_PATTERNS) {
    const allMatch =
      rule.patterns.length === 1
        ? rule.patterns[0].test(combined)
        : rule.patterns.every((p) => p.test(combined));

    if (allMatch && !seen.has(rule.flag)) {
      seen.add(rule.flag);
      matches.push({
        flag: rule.flag,
        urgency: rule.urgency,
        department: rule.department,
        reason: rule.reason,
      });
    }
  }

  return matches.sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency));
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

export function mergeUrgency(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
  return urgencyRank(a) >= urgencyRank(b) ? a : b;
}
