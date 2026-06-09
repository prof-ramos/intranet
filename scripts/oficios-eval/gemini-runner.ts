/**
 * Cliente Gemini mínimo para o harness de avaliação.
 *
 * Independente de `src/lib/ai/gemini.ts` (que é `server-only` e depende de DB):
 * lê a chave de `GEMINI_API_KEY` no ambiente ou, como fallback, de `.env.local`,
 * e chama a API diretamente com a system instruction escolhida.
 */

import { readFileSync } from 'node:fs';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

let cachedKey: string | null = null;

function loadApiKey(): string {
  if (cachedKey) return cachedKey;

  let key = process.env.GEMINI_API_KEY?.trim();

  if (!key) {
    try {
      const env = readFileSync('.env.local', 'utf-8');
      const match = env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/m);
      if (match) {
        key = match[1].trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      // .env.local ausente — ignorado
    }
  }

  if (!key) {
    throw new Error(
      'GEMINI_API_KEY não encontrada. Defina no ambiente (export GEMINI_API_KEY=...) ou em .env.local.',
    );
  }
  cachedKey = key;
  return key;
}

function safetySettings() {
  return [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];
}

export interface GenerateOptions {
  systemInstruction: string;
  userMessage: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function generateLetter(opts: GenerateOptions): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: loadApiKey() });
  const result = await ai.models.generateContent({
    model: opts.model,
    contents: opts.userMessage,
    config: {
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      safetySettings: safetySettings(),
    },
  });

  const blockReason = result.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Geração bloqueada pela política de conteúdo (${blockReason}).`);
  }
  return result.text ?? '';
}
