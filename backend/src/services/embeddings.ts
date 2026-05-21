import { config } from '../config.js';

/** Simple deterministic embedding for demo mode (384-dim style vector) */
function hashEmbed(text: string, dims = 384): number[] {
  const vec = new Array(dims).fill(0);
  const normalized = text.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vec[i % dims] += (code * (i + 1)) / 255;
    vec[(i * 7 + 13) % dims] += code / 512;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  if (config.demoMode && !config.gemini.apiKey) {
    return hashEmbed(text);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const values = result.embedding?.values;
    if (values?.length) return values;
  } catch {
    // fall through
  }

  return hashEmbed(text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => embedText(t)));
}
