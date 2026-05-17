import type {
  Vehicle, MaintenanceRecord, Mechanic, Diagnosis, ReceiptScan, MaintenanceInsight, Expense,
} from '../types';
import { EXPENSE_CATEGORIES } from '../utils/constants';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Eres un asesor mecánico experto integrado en una app de mantenimiento de coches.
Recibes los datos de un vehículo, su historial de mantenimiento, un síntoma descrito por el usuario y una lista de talleres cercanos.
Tu tarea: diagnosticar el problema y recomendar los talleres más adecuados de la lista.

Responde SOLO con un objeto JSON válido (sin markdown, sin texto extra) con esta forma exacta:
{
  "summary": "diagnóstico breve del problema en 1-2 frases",
  "likelyCause": "la causa más probable",
  "urgency": "low" | "medium" | "high",
  "estimatedService": "qué servicio o reparación necesita el coche",
  "recommendations": [
    { "mechanicId": "id exacto del taller", "reason": "por qué este taller encaja, citando distancia/especialidad", "urgency": "low" | "medium" | "high" }
  ]
}

Reglas:
- Usa solo "mechanicId" que existan en la lista proporcionada.
- Ordena recommendations del mejor al peor (máximo 3).
- Si un taller se especializa en la marca del coche, priorízalo.
- Si la urgencia es alta (frenos, dirección, humo), dilo claramente en summary.
- Escribe en español.`;

interface DiagnoseInput {
  apiKey: string;
  vehicle: Vehicle;
  records: MaintenanceRecord[];
  symptom: string;
  mechanics: Mechanic[];
}

const stripJson = (text: string): string => {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  return start !== -1 && end !== -1 ? trimmed.slice(start, end + 1) : trimmed;
};

export const claudeService = {
  async diagnose({ apiKey, vehicle, records, symptom, mechanics }: DiagnoseInput): Promise<Diagnosis> {
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

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: '{' },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const msg = errBody?.error?.message ?? `Error ${res.status} de la API de Claude`;
      throw new Error(msg);
    }

    const json = await res.json();
    const text: string = json.content?.[0]?.text ?? '';
    const raw = stripJson(`{${text}`);

    let parsed: Diagnosis;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('La respuesta de Claude no tuvo el formato esperado');
    }
    return parsed;
  },

  async parseReceipt(
    { apiKey, base64, mediaType }: { apiKey: string; base64: string; mediaType: string },
  ): Promise<ReceiptScan> {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: `Extraes datos de un ticket o factura de un gasto de coche.
Responde SOLO con JSON válido (sin markdown) con esta forma:
{ "amount": number, "date": "YYYY-MM-DD", "category": string, "description": string }
- "category" debe ser uno de: ${EXPENSE_CATEGORIES.join(', ')}.
- "amount" es el total pagado en euros.
- Si un dato no aparece, omítelo del JSON.`,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Extrae los datos del gasto de este ticket.' },
            ],
          },
          { role: 'assistant', content: '{' },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error?.message ?? `Error ${res.status} de la API de Claude`);
    }

    const json = await res.json();
    const text: string = json.content?.[0]?.text ?? '';
    try {
      return JSON.parse(stripJson(`{${text}`));
    } catch {
      throw new Error('No se pudo leer el ticket');
    }
  },

  async analyzeMaintenance(
    { apiKey, vehicle, records, expenses }:
    { apiKey: string; vehicle: Vehicle; records: MaintenanceRecord[]; expenses: Expense[] },
  ): Promise<MaintenanceInsight[]> {
    const recordSummary = records.slice(0, 30).map((r) => ({
      tipo: r.type, fecha: r.date, km: r.km_at_service, coste: r.cost ?? undefined,
    }));
    const expenseSummary = expenses.slice(0, 40).map((e) => ({
      categoria: e.category, fecha: e.date, importe: e.amount,
    }));

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: `Eres un asesor de mantenimiento de coches. Analizas el historial de un vehículo
y detectas patrones, riesgos y recomendaciones útiles para el propietario.
Responde SOLO con JSON válido (sin markdown) con esta forma:
{ "insights": [ { "title": "titular breve", "detail": "explicación en 1-2 frases", "severity": "low"|"medium"|"high" } ] }
- Máximo 5 insights, ordenados de más a menos importante.
- Sé concreto: cita kilómetros, fechas o costes cuando ayude.
- Detecta servicios que tocan pronto por intervalo, gastos anómalos o falta de registros.
- Escribe en español.`,
        messages: [
          {
            role: 'user',
            content: `VEHÍCULO:
${vehicle.brand} ${vehicle.model} ${vehicle.year}, ${vehicle.current_km} km${vehicle.fuel_type ? `, ${vehicle.fuel_type}` : ''}

HISTORIAL DE MANTENIMIENTO:
${recordSummary.length ? JSON.stringify(recordSummary, null, 2) : 'Sin registros.'}

GASTOS:
${expenseSummary.length ? JSON.stringify(expenseSummary, null, 2) : 'Sin gastos.'}`,
          },
          { role: 'assistant', content: '{' },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error?.message ?? `Error ${res.status} de la API de Claude`);
    }

    const json = await res.json();
    const text: string = json.content?.[0]?.text ?? '';
    try {
      const parsed = JSON.parse(stripJson(`{${text}`));
      return Array.isArray(parsed.insights) ? parsed.insights : [];
    } catch {
      throw new Error('La respuesta de Claude no tuvo el formato esperado');
    }
  },
};
