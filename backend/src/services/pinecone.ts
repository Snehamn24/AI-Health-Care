import { readFileSync } from 'fs';
import { join } from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config.js';
import { embedText, embedBatch } from './embeddings.js';

function loadGuidelines(): Array<{
  id: string;
  symptom: string;
  department: string;
  guideline: string;
  clarifying_questions: string[];
  red_flags: string[];
}> {
  const paths = [
    join(process.cwd(), 'src/data/clinical-guidelines.json'),
    join(process.cwd(), 'dist/data/clinical-guidelines.json'),
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, 'utf-8'));
    } catch {
      /* try next path */
    }
  }
  throw new Error('clinical-guidelines.json not found');
}

const guidelines = loadGuidelines();

interface ClinicalRecord {
  id: string;
  symptom: string;
  department: string;
  guideline: string;
  clarifying_questions: string[];
  red_flags: string[];
  score?: number;
}

let pineconeClient: Pinecone | null = null;
const localVectorStore: Map<string, { vector: number[]; metadata: ClinicalRecord }> = new Map();

function useLocalStore(): boolean {
  return config.demoMode || !config.pinecone.apiKey;
}

async function getIndex() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: config.pinecone.apiKey });
  }
  return pineconeClient.index(config.pinecone.index);
}

export async function seedClinicalGuidelines(): Promise<{ count: number; mode: string }> {
  const records = guidelines as Array<{
    id: string;
    symptom: string;
    department: string;
    guideline: string;
    clarifying_questions: string[];
    red_flags: string[];
  }>;

  const texts = records.map(
    (r) => `${r.symptom}. ${r.guideline}. Department: ${r.department}. Red flags: ${r.red_flags.join(', ')}`
  );
  const vectors = await embedBatch(texts);

  if (useLocalStore()) {
    records.forEach((r, i) => {
      localVectorStore.set(r.id, {
        vector: vectors[i],
        metadata: {
          id: r.id,
          symptom: r.symptom,
          department: r.department,
          guideline: r.guideline,
          clarifying_questions: r.clarifying_questions,
          red_flags: r.red_flags,
        },
      });
    });
    return { count: records.length, mode: 'local' };
  }

  const index = await getIndex();
  await index.namespace(config.pinecone.namespace).upsert(
    records.map((r, i) => ({
      id: r.id,
      values: vectors[i],
      metadata: {
        symptom: r.symptom,
        department: r.department,
        guideline: r.guideline,
        clarifying_questions: JSON.stringify(r.clarifying_questions),
        red_flags: JSON.stringify(r.red_flags),
      },
    }))
  );
  return { count: records.length, mode: 'pinecone' };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function searchClinicalContext(
  query: string,
  topK = 3
): Promise<ClinicalRecord[]> {
  const queryVector = await embedText(query);

  if (useLocalStore()) {
    const results = [...localVectorStore.values()]
      .map((entry) => ({
        ...entry.metadata,
        score: cosineSimilarity(queryVector, entry.vector),
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);
    return results;
  }

  try {
    const index = await getIndex();
    const response = await index.namespace(config.pinecone.namespace).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    return (response.matches || []).map((m) => ({
      id: m.id,
      symptom: (m.metadata?.symptom as string) || '',
      department: (m.metadata?.department as string) || '',
      guideline: (m.metadata?.guideline as string) || '',
      clarifying_questions: JSON.parse((m.metadata?.clarifying_questions as string) || '[]'),
      red_flags: JSON.parse((m.metadata?.red_flags as string) || '[]'),
      score: m.score,
    }));
  } catch {
    if (localVectorStore.size === 0) await seedClinicalGuidelines();
    return searchClinicalContext(query, topK);
  }
}

// Initialize local store on startup in demo mode
seedClinicalGuidelines().catch(() => {});
