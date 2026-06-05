import { describe, expect, it } from 'vitest';
import {
  buildWorkshopPriorityItems,
  deriveWorkshopStatus,
  workshopStatusLabel,
} from './workshopDossier';
import type { FailurePrediction, OBD2Anomaly } from '../types';

const basePrediction: FailurePrediction = {
  key: 'oil',
  label: 'Aceite y filtro',
  lifespanKm: 15000,
  lastServiceKm: 0,
  predictedKm: 15000,
  kmRemaining: 4000,
  lifeUsedPct: 73,
  status: 'ok',
};

describe('workshopDossier', () => {
  it('prioriza anomalías críticas y deriva estado crítico', () => {
    const anomalies: OBD2Anomaly[] = [
      {
        id: 'a1',
        type: 'overtemp',
        severity: 'critical',
        value: 115,
        threshold: 110,
        message: 'Motor sobrecalentado: 115°C',
      },
    ];

    const items = buildWorkshopPriorityItems({
      anomalies,
      predictions: [{ ...basePrediction, status: 'soon', kmRemaining: 1200, lifeUsedPct: 92 }],
      documents: [],
      insurance: null,
    });

    expect(items[0].source).toBe('obd2');
    expect(deriveWorkshopStatus(items)).toBe('critical');
    expect(workshopStatusLabel('critical')).toBe('Crítico');
  });

  it('marca vencimientos próximos como revisar pronto', () => {
    const now = new Date('2026-06-05T12:00:00Z');
    const items = buildWorkshopPriorityItems({
      anomalies: [],
      predictions: [],
      documents: [
        {
          id: 'doc-1',
          doc_type: 'ITV',
          file_url: 'https://example.com/itv.pdf',
          file_name: 'itv.pdf',
          expiry_date: '2026-06-20',
          is_important: true,
          created_at: '2026-01-01',
        },
      ],
      insurance: null,
      now,
    });

    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('soon');
    expect(deriveWorkshopStatus(items)).toBe('soon');
  });

  it('devuelve OK sin incidencias', () => {
    const items = buildWorkshopPriorityItems({
      anomalies: [],
      predictions: [basePrediction],
      documents: [],
      insurance: null,
    });

    expect(items).toHaveLength(0);
    expect(deriveWorkshopStatus(items)).toBe('ok');
  });
});
