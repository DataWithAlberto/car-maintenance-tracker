import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { accessService } from '../services/access.service';
import { geminiService, stripJson } from '../services/gemini.service';
import { ValidationError } from '../utils/errors';

const EXPENSE_CATEGORIES = [
  'Combustible',
  'Mantenimiento',
  'Seguro',
  'ITV',
  'Lavado',
  'Parking',
  'Peajes',
  'Multas',
  'Accesorios',
  'Otros',
];

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

const looseVehicleSchema = z.object({
  id: z.string().optional(),
  brand: z.string(),
  model: z.string(),
  year: z.number(),
  current_km: z.number(),
  fuel_type: z.string().nullish(),
  transmission: z.string().nullish(),
});

const diagnoseSchema = z.object({
  vehicle: looseVehicleSchema,
  records: z.array(z.record(z.string(), z.unknown())).default([]),
  symptom: z.string().min(8),
  mechanics: z.array(z.record(z.string(), z.unknown())).default([]),
});

const receiptSchema = z.object({
  base64: z.string().min(1),
  mediaType: z.string().min(3),
});

const analysisSchema = z.object({
  vehicle: looseVehicleSchema,
  records: z.array(z.record(z.string(), z.unknown())).default([]),
  expenses: z.array(z.record(z.string(), z.unknown())).default([]),
});

const ensureVehicleAccess = async (userId: string, vehicleId?: string) => {
  if (vehicleId) await accessService.requireRead(userId, vehicleId);
};

export const aiController = {
  async diagnose(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = diagnoseSchema.parse(req.body);
      await ensureVehicleAccess(req.user!.id, body.vehicle.id);

      const recentRecords = body.records.slice(0, 8);
      const mechanicList = body.mechanics.slice(0, 20);
      const userMessage = `VEHÍCULO:
${body.vehicle.brand} ${body.vehicle.model} ${body.vehicle.year}, ${body.vehicle.current_km} km${body.vehicle.fuel_type ? `, ${body.vehicle.fuel_type}` : ''}${body.vehicle.transmission ? `, ${body.vehicle.transmission}` : ''}

HISTORIAL DE MANTENIMIENTO:
${recentRecords.length ? JSON.stringify(recentRecords, null, 2) : 'Sin registros previos.'}

SÍNTOMA DESCRITO POR EL USUARIO:
"${body.symptom}"

TALLERES CERCANOS:
${JSON.stringify(mechanicList, null, 2)}`;

      const text = await geminiService.generateJson({
        system: SYSTEM_PROMPT,
        userParts: [{ text: userMessage }],
        maxTokens: 1024,
      });
      res.json(JSON.parse(stripJson(text)));
    } catch (err) {
      next(err instanceof SyntaxError ? new ValidationError('La IA no devolvió JSON válido') : err);
    }
  },

  async receipt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = receiptSchema.parse(req.body);
      const text = await geminiService.generateJson({
        system: RECEIPT_SYSTEM,
        userParts: [
          { inline_data: { mime_type: body.mediaType, data: body.base64 } },
          { text: 'Extrae los datos del gasto de este ticket.' },
        ],
        maxTokens: 512,
      });
      res.json(JSON.parse(stripJson(text)));
    } catch (err) {
      next(err instanceof SyntaxError ? new ValidationError('La IA no devolvió JSON válido') : err);
    }
  },

  async maintenanceInsights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = analysisSchema.parse(req.body);
      await ensureVehicleAccess(req.user!.id, body.vehicle.id);
      const text = await geminiService.generateJson({
        system: ANALYSIS_SYSTEM,
        userParts: [
          {
            text: `VEHÍCULO:
${body.vehicle.brand} ${body.vehicle.model} ${body.vehicle.year}, ${body.vehicle.current_km} km${body.vehicle.fuel_type ? `, ${body.vehicle.fuel_type}` : ''}

HISTORIAL DE MANTENIMIENTO:
${body.records.length ? JSON.stringify(body.records.slice(0, 30), null, 2) : 'Sin registros.'}

GASTOS:
${body.expenses.length ? JSON.stringify(body.expenses.slice(0, 40), null, 2) : 'Sin gastos.'}`,
          },
        ],
        maxTokens: 1024,
      });
      const parsed = JSON.parse(stripJson(text));
      res.json({ insights: Array.isArray(parsed.insights) ? parsed.insights : [] });
    } catch (err) {
      next(err instanceof SyntaxError ? new ValidationError('La IA no devolvió JSON válido') : err);
    }
  },
};
