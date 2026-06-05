import type { FailurePrediction, OBD2Anomaly } from '../types';
import type { WorkshopDocument, WorkshopInsurance } from '../services/workshop.service';

export type WorkshopStatus = 'critical' | 'soon' | 'ok';

export interface WorkshopPriorityItem {
  id: string;
  title: string;
  detail: string;
  status: WorkshopStatus;
  source: 'obd2' | 'maintenance' | 'document' | 'insurance';
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysUntil = (iso?: string | null, now = new Date()): number | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
};

const statusWeight: Record<WorkshopStatus, number> = { critical: 0, soon: 1, ok: 2 };

export const buildWorkshopPriorityItems = ({
  anomalies,
  predictions,
  documents,
  insurance,
  now = new Date(),
}: {
  anomalies: OBD2Anomaly[];
  predictions: FailurePrediction[];
  documents: WorkshopDocument[];
  insurance: WorkshopInsurance | null;
  now?: Date;
}): WorkshopPriorityItem[] => {
  const items: WorkshopPriorityItem[] = [];

  for (const anomaly of anomalies) {
    items.push({
      id: `obd2-${anomaly.id ?? anomaly.type}`,
      title: anomaly.severity === 'critical' ? 'Anomalía OBD crítica' : 'Anomalía OBD',
      detail: anomaly.message,
      status: anomaly.severity === 'critical' ? 'critical' : 'soon',
      source: 'obd2',
    });
  }

  for (const prediction of predictions) {
    if (prediction.status === 'ok') continue;
    items.push({
      id: `maintenance-${prediction.key}`,
      title: prediction.status === 'overdue' ? 'Componente vencido' : 'Componente próximo',
      detail:
        prediction.kmRemaining <= 0
          ? `${prediction.label}: pasado por ${Math.abs(Math.round(prediction.kmRemaining)).toLocaleString('es-ES')} km`
          : `${prediction.label}: quedan ${Math.round(prediction.kmRemaining).toLocaleString('es-ES')} km`,
      status: prediction.status === 'overdue' ? 'critical' : 'soon',
      source: 'maintenance',
    });
  }

  for (const document of documents) {
    const remaining = daysUntil(document.expiry_date, now);
    if (remaining == null || remaining > 30) continue;
    items.push({
      id: `document-${document.id}`,
      title: remaining < 0 ? 'Documento vencido' : 'Documento próximo a vencer',
      detail: `${document.doc_type}${remaining < 0 ? ` vencido hace ${Math.abs(remaining)} días` : ` vence en ${remaining} días`}`,
      status: remaining < 0 ? 'critical' : 'soon',
      source: 'document',
    });
  }

  const insuranceRemaining = daysUntil(insurance?.end_date, now);
  if (insuranceRemaining != null && insuranceRemaining <= 30) {
    items.push({
      id: 'insurance-active',
      title: insuranceRemaining < 0 ? 'Seguro vencido' : 'Seguro próximo a vencer',
      detail:
        insuranceRemaining < 0
          ? `${insurance?.provider ?? 'Seguro'} vencido hace ${Math.abs(insuranceRemaining)} días`
          : `${insurance?.provider ?? 'Seguro'} vence en ${insuranceRemaining} días`,
      status: insuranceRemaining < 0 ? 'critical' : 'soon',
      source: 'insurance',
    });
  }

  return items.sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
};

export const deriveWorkshopStatus = (items: WorkshopPriorityItem[]): WorkshopStatus => {
  if (items.some((item) => item.status === 'critical')) return 'critical';
  if (items.some((item) => item.status === 'soon')) return 'soon';
  return 'ok';
};

export const workshopStatusLabel = (status: WorkshopStatus): string => {
  if (status === 'critical') return 'Crítico';
  if (status === 'soon') return 'Revisar pronto';
  return 'Sin incidencias graves';
};
