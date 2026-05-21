import { searchClinicalContext } from './pinecone.js';

export interface RAGContext {
  contextText: string;
  clarifyingQuestions: string[];
  relatedDepartments: string[];
  redFlagHints: string[];
  sources: string[];
}

export async function retrieveClinicalContext(symptomQuery: string): Promise<RAGContext> {
  const matches = await searchClinicalContext(symptomQuery, 3);

  if (matches.length === 0) {
    return {
      contextText: 'No specific clinical guideline match. Apply general intake protocols.',
      clarifyingQuestions: [
        'When did your symptoms start?',
        'How would you rate the severity on a scale of mild to severe?',
      ],
      relatedDepartments: ['General Medicine'],
      redFlagHints: [],
      sources: [],
    };
  }

  const clarifyingQuestions = [
    ...new Set(matches.flatMap((m) => m.clarifying_questions)),
  ].slice(0, 4);

  const contextText = matches
    .map(
      (m, i) =>
        `[${i + 1}] ${m.symptom} (${m.department}): ${m.guideline} Red flags: ${m.red_flags.join('; ')}`
    )
    .join('\n');

  return {
    contextText,
    clarifyingQuestions,
    relatedDepartments: [...new Set(matches.map((m) => m.department))],
    redFlagHints: [...new Set(matches.flatMap((m) => m.red_flags))],
    sources: matches.map((m) => m.id),
  };
}
