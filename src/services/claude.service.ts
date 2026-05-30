import type {
  Vehicle,
  MaintenanceRecord,
  Mechanic,
  Diagnosis,
  ReceiptScan,
  MaintenanceInsight,
  Expense,
} from '../types';
import type { AIConfig } from '../store/apiKeyStore';
import { EXPENSE_CATEGORIES } from '../utils/constants';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_PROMPT = `Eres un asesor mecánico experto integrado en una app de mantenimiento de coches.
Recibes los datos de un vehículo, su historial de mantenimiento y un síntoma descrito por el usuario.
Opcionalmente recibes una lista de talleres cercanos.

Responde SOLO con un objeto JSON válido (sin markdown, sin texto extra) con esta forma exacta:
{
  "summary": "diagnóstico breve del problema en 1-2 frases",
  "likelyCause": "la causa más probable",
  "urgency": "low" | "medium" | "high",
  "estimatedService": "qué servicio o reparación necesita el coche",
  "recommendations": [
    { "mechanicId": "id exacto del taller", "reason": "por qué este taller encaja", "urgency": "low" | "medium" | "high" }
  ]
}

Reglas:
- Si hay talleres en la lista, usa solo "mechanicId" que existan en ella. Ordena del mejor al peor (máximo 3).
- Si no hay lista de talleres, devuelve "recommendations": [].
- Si un taller se especializa en la marca del coche, priorízalo.
- Si la urgencia es alta (frenos, dirección, humo), dilo claramente en summary.
- Escribe en español.`;

const RECEIPT_SYSTEM = `Extraes datos de un ticket o factura de un gasto de coche.
Responde SOLO con JSON válido (sin markdown) con esta forma:
{ "amount": number, "date": "YYYY-MM-DD", "category": string, "description": string }
- "category" debe ser uno de: ${EXPENSE_CATEGORIES.join(', ')}.
- "amount" es el total pagado en euros.
- Si un dato no aparece, omítelo del JSON.`;

const ANALYSIS_SYSTEM = `Eres un asesor de mantenimiento de coches. Analizas el historial de un vehículo
y detectas patrones, riesgos y recomendaciones útiles para el propietario.
Responde SOLO con JSON válido (sin markdown) con esta forma:
{ "insights": [ { "title": "titular breve", "detail": "explicación en 1-2 frases", "severity": "low"|"medium"|"high" } ] }
- Máximo 5 insights, ordenados de más a menos importante.
- Sé concreto: cita kilómetros, fechas o costes cuando ayude.
- Detecta servicios que tocan pronto por intervalo, gastos anómalos o falta de registros.
- Escribe en español.`;

interface DiagnoseInput {
  apiKey: string;
  vehicle: Vehicle;
  records: MaintenanceRecord[];
  symptom: string;
  mechanics: Mechanic[];
  signal?: AbortSignal;
}

interface ParseReceiptInput {
  apiKey: string;
  base64: string;
  mediaType: string;
  signal?: AbortSignal;
}

interface AnalyzeInput {
  apiKey: string;
  vehicle: Vehicle;
  records: MaintenanceRecord[];
  expenses: Expense[];
  signal?: AbortSignal;
}

interface GeminiCall {
  apiKey: string;
  system: string;
  userParts: unknown[];
  maxTokens: number;
  signal?: AbortSignal;
}

const stripJson = (text: string): string => {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  return start !== -1 && end !== -1 ? trimmed.slice(start, end + 1) : trimmed;
};

async function callGemini({
  apiKey,
  system,
  userParts,
  maxTokens,
  signal,
}: GeminiCall): Promise<string> {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: { maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
  });

  let lastMessage = 'Error desconocido de la API de Gemini';
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (res.ok) {
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    const errBody = await res.json().catch(() => null);
    lastMessage = errBody?.error?.message ?? `Error ${res.status} de la API de Gemini`;

    // Solo reintenta con otro modelo si es un error de cuota (429) o de acceso (403)
    if (res.status !== 429 && res.status !== 403) break;
  }

  throw new Error(lastMessage);
}

/* ─── Ollama local ────────────────────────────────────────────────────────
 * Ollama acepta una API estilo chat con `format: "json"` que fuerza al
 * modelo a devolver JSON parseable.
 * Requisitos en el host: `OLLAMA_ORIGINS="*"` (o el origen concreto) para
 * permitir CORS desde el navegador. La URL típica es http://localhost:11434. */
interface OllamaCall {
  url: string;
  model: string;
  system: string;
  userText: string;
  maxTokens: number;
  signal?: AbortSignal;
}

async function callOllama({
  url,
  model,
  system,
  userText,
  maxTokens,
  signal,
}: OllamaCall): Promise<string> {
  const base = url.replace(/\/+$/, '');
  let res: Response;
  try {
    res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText },
        ],
        options: { num_predict: maxTokens },
      }),
    });
  } catch (err) {
    throw new Error(
      `No se pudo conectar a Ollama en ${base}. ¿Lo tienes corriendo y con OLLAMA_ORIGINS="*"? (${
        err instanceof Error ? err.message : 'fetch failed'
      })`,
      { cause: err },
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 404) {
      throw new Error(`Ollama no encuentra el modelo "${model}". Ejecuta: ollama pull ${model}`);
    }
    throw new Error(`Ollama devolvió ${res.status}: ${errText || res.statusText}`);
  }
  const json = await res.json();
  return json.message?.content ?? '';
}

/* Concatena las partes de Gemini en un string plano para Ollama. */
const partsToText = (parts: unknown[]): string =>
  parts
    .map((p) => {
      if (typeof p === 'string') return p;
      if (p && typeof p === 'object' && 'text' in p) return String((p as { text: unknown }).text);
      return '';
    })
    .filter(Boolean)
    .join('\n');

/* Router unificado: elige Gemini cloud u Ollama local según AIConfig. */
async function callAI({
  config,
  system,
  userParts,
  maxTokens,
  signal,
}: {
  config: AIConfig;
  system: string;
  userParts: unknown[];
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<string> {
  if (config.provider === 'ollama') {
    return callOllama({
      url: config.ollamaUrl,
      model: config.ollamaModel,
      system,
      userText: partsToText(userParts),
      maxTokens,
      signal,
    });
  }
  return callGemini({
    apiKey: config.geminiApiKey,
    system,
    userParts,
    maxTokens,
    signal,
  });
}

export const aiService = {
  async diagnose({
    apiKey,
    vehicle,
    records,
    symptom,
    mechanics,
    signal,
  }: DiagnoseInput): Promise<Diagnosis> {
    const recentRecords = records.slice(0, 8).map((r) => ({
      tipo: r.type,
      fecha: r.date,
      km: r.km_at_service,
      descripcion: r.description ?? undefined,
    }));

    const mechanicList = mechanics.slice(0, 20).map((m) => ({
      id: m.id,
      nombre: m.name,
      distancia_km: Number(m.distanceKm.toFixed(1)),
      marca: m.brand ?? undefined,
      horario: m.openingHours ?? undefined,
    }));

    const userMessage = `VEHÍCULO:
${vehicle.brand} ${vehicle.model} ${vehicle.year}, ${vehicle.current_km} km${vehicle.fuel_type ? `, ${vehicle.fuel_type}` : ''}${vehicle.transmission ? `, ${vehicle.transmission}` : ''}

HISTORIAL DE MANTENIMIENTO:
${recentRecords.length ? JSON.stringify(recentRecords, null, 2) : 'Sin registros previos.'}

SÍNTOMA DESCRITO POR EL USUARIO:
"${symptom}"

TALLERES CERCANOS:
${JSON.stringify(mechanicList, null, 2)}`;

    const text = await callGemini({
      apiKey,
      system: SYSTEM_PROMPT,
      userParts: [{ text: userMessage }],
      maxTokens: 1024,
      signal,
    });

    try {
      return JSON.parse(stripJson(text));
    } catch {
      throw new Error('La respuesta de la IA no tuvo el formato esperado');
    }
  },

  async parseReceipt({
    apiKey,
    base64,
    mediaType,
    signal,
  }: ParseReceiptInput): Promise<ReceiptScan> {
    const text = await callGemini({
      apiKey,
      system: RECEIPT_SYSTEM,
      userParts: [
        { inline_data: { mime_type: mediaType, data: base64 } },
        { text: 'Extrae los datos del gasto de este ticket.' },
      ],
      maxTokens: 512,
      signal,
    });

    try {
      return JSON.parse(stripJson(text));
    } catch {
      throw new Error('No se pudo leer el ticket');
    }
  },

  async analyzeMaintenance({
    apiKey,
    vehicle,
    records,
    expenses,
    signal,
  }: AnalyzeInput): Promise<MaintenanceInsight[]> {
    const recordSummary = records.slice(0, 30).map((r) => ({
      tipo: r.type,
      fecha: r.date,
      km: r.km_at_service,
      coste: r.cost ?? undefined,
    }));
    const expenseSummary = expenses.slice(0, 40).map((e) => ({
      categoria: e.category,
      fecha: e.date,
      importe: e.amount,
    }));

    const text = await callGemini({
      apiKey,
      system: ANALYSIS_SYSTEM,
      userParts: [
        {
          text: `VEHÍCULO:
${vehicle.brand} ${vehicle.model} ${vehicle.year}, ${vehicle.current_km} km${vehicle.fuel_type ? `, ${vehicle.fuel_type}` : ''}

HISTORIAL DE MANTENIMIENTO:
${recordSummary.length ? JSON.stringify(recordSummary, null, 2) : 'Sin registros.'}

GASTOS:
${expenseSummary.length ? JSON.stringify(expenseSummary, null, 2) : 'Sin gastos.'}`,
        },
      ],
      maxTokens: 1024,
      signal,
    });

    try {
      const parsed = JSON.parse(stripJson(text));
      return Array.isArray(parsed.insights) ? parsed.insights : [];
    } catch {
      throw new Error('La respuesta de la IA no tuvo el formato esperado');
    }
  },

  /* Genera 3 curiosidades cortas y verificables sobre un destino. */
  async surpriseFunFacts({
    config,
    destination,
    signal,
  }: {
    config: AIConfig;
    destination: string;
    signal?: AbortSignal;
  }): Promise<string[]> {
    const text = await callAI({
      config,
      system:
        'Genera 3 curiosidades cortas, ciertas y poco conocidas sobre un destino turístico. Responde SOLO con JSON: {"facts": ["...", "...", "..."]}. Cada curiosidad debe ocupar como máximo 2 líneas (160 caracteres). Escribe en español.',
      userParts: [{ text: `Destino: ${destination}` }],
      maxTokens: 512,
      signal,
    });
    try {
      const parsed = JSON.parse(stripJson(text));
      const facts = Array.isArray(parsed.facts) ? parsed.facts : [];
      return facts.filter((f: unknown): f is string => typeof f === 'string').slice(0, 3);
    } catch {
      throw new Error('La IA no devolvió curiosidades en el formato esperado');
    }
  },

  /* Sugiere actividades para un destino según fecha y duración. */
  async suggestTripActivities({
    config,
    destination,
    startDate,
    days,
    signal,
  }: {
    config: AIConfig;
    destination: string;
    startDate?: string | null;
    days?: number;
    signal?: AbortSignal;
  }): Promise<Array<{ title: string; type: string; notes: string }>> {
    const text = await callAI({
      config,
      system: `Sugiere actividades turísticas reales y bien valoradas para un destino.
Responde SOLO con JSON válido:
{ "activities": [ { "title": "string", "type": "experience"|"museum"|"food"|"lodging", "notes": "explicación breve en 1-2 frases" } ] }
- Máximo 6 actividades, variadas (cultural, gastronomía, ocio).
- "title" debe ser concreto y específico (no genérico).
- "type" debe ser uno de: experience, museum, food, lodging.
- Escribe en español.`,
      userParts: [
        {
          text: `Destino: ${destination}\nFechas: ${startDate ?? 'sin fecha concreta'}\nDuración: ${days ?? 2} días`,
        },
      ],
      maxTokens: 1024,
      signal,
    });
    try {
      const parsed = JSON.parse(stripJson(text));
      const list = Array.isArray(parsed.activities) ? parsed.activities : [];
      return list
        .filter(
          (a: unknown): a is { title: string; type: string; notes: string } =>
            typeof a === 'object' &&
            a !== null &&
            typeof (a as { title?: unknown }).title === 'string',
        )
        .slice(0, 6);
    } catch {
      throw new Error('La IA no devolvió actividades en el formato esperado');
    }
  },

  /* Ping a Ollama: comprueba que el servidor responde y que el modelo existe. */
  async checkOllama({
    url,
    model,
    signal,
  }: {
    url: string;
    model: string;
    signal?: AbortSignal;
  }): Promise<{ ok: true; tags: string[] } | { ok: false; reason: string }> {
    const base = url.replace(/\/+$/, '');
    try {
      const res = await fetch(`${base}/api/tags`, { signal });
      if (!res.ok) {
        return { ok: false, reason: `Ollama respondió ${res.status}` };
      }
      const json = await res.json();
      const tags = Array.isArray(json.models)
        ? json.models.map((m: { name: string }) => m.name)
        : [];
      // Aceptamos tanto "llama3.1" como "llama3.1:latest"
      const found = tags.some((t: string) => t === model || t.startsWith(`${model}:`));
      if (!found && tags.length > 0) {
        return {
          ok: false,
          reason: `Modelo "${model}" no instalado. Disponibles: ${tags.slice(0, 5).join(', ')}. Ejecuta: ollama pull ${model}`,
        };
      }
      return { ok: true, tags };
    } catch (err) {
      return {
        ok: false,
        reason: `No se pudo conectar a ${base}. ¿Está Ollama corriendo con OLLAMA_ORIGINS="*"? (${
          err instanceof Error ? err.message : 'fetch error'
        })`,
      };
    }
  },
};

// Alias para compatibilidad con importaciones existentes
export const claudeService = aiService;
