import { env } from '../config/environment';
import { HttpError } from '../utils/errors';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiCall {
  system: string;
  userParts: unknown[];
  maxTokens: number;
}

export const stripJson = (text: string): string => {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  return start !== -1 && end !== -1 ? trimmed.slice(start, end + 1) : trimmed;
};

export const geminiService = {
  async generateJson({ system, userParts, maxTokens }: GeminiCall): Promise<string> {
    if (!env.geminiApiKey) {
      throw new HttpError(503, 'GEMINI_API_KEY no está configurada en el servidor');
    }

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: { maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    });

    let lastMessage = 'Error desconocido de la API de Gemini';
    for (const model of GEMINI_MODELS) {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${env.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (res.ok) {
        const json = await res.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      }

      const errBody = await res.json().catch(() => null);
      lastMessage = errBody?.error?.message ?? `Error ${res.status} de la API de Gemini`;
      if (res.status !== 429 && res.status !== 403) break;
    }

    throw new HttpError(502, lastMessage);
  },
};
