import type { MaintenanceRecord, Vehicle, Alert, Document } from '../types';
import {
  OIL_CHANGE_KM_INTERVAL,
  OIL_CHANGE_MONTH_INTERVAL,
  GENERAL_SERVICE_KM_INTERVAL,
} from './constants';

const DAY_MS = 86_400_000;

export const calculateAlerts = (vehicle: Vehicle, records: MaintenanceRecord[]): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();
  const nowMs = now.getTime();

  // Una sola pasada: encuentra el cambio de aceite más reciente sin filtrar
  // ni ordenar (evita el array intermedio y el O(K log K) del sort).
  let lastOilChange: MaintenanceRecord | undefined;
  let lastOilMs = -Infinity;
  for (const r of records) {
    if (r.type !== 'Cambio de aceite') continue;
    const t = new Date(r.date).getTime();
    if (t > lastOilMs) {
      lastOilMs = t;
      lastOilChange = r;
    }
  }

  if (lastOilChange) {
    const kmDiff = vehicle.current_km - lastOilChange.km_at_service;
    // addMonths nativo: setMonth maneja el rollover de año correctamente.
    const nextDate = new Date(lastOilMs);
    nextDate.setMonth(nextDate.getMonth() + OIL_CHANGE_MONTH_INTERVAL);

    if (kmDiff >= OIL_CHANGE_KM_INTERVAL || nextDate.getTime() < nowMs) {
      alerts.push({
        id: `oil-${vehicle.id}`,
        vehicle_id: vehicle.id,
        type: 'oil_change',
        description: `Cambio de aceite vencido. Último: ${lastOilChange.km_at_service.toLocaleString()} km (${kmDiff.toLocaleString()} km hace)`,
        severity: 'high',
        is_dismissed: false,
        created_at: now.toISOString(),
      });
    } else if (kmDiff >= OIL_CHANGE_KM_INTERVAL * 0.8) {
      alerts.push({
        id: `oil-warn-${vehicle.id}`,
        vehicle_id: vehicle.id,
        type: 'oil_change_soon',
        description: `Cambio de aceite pronto. Quedan ${(OIL_CHANGE_KM_INTERVAL - kmDiff).toLocaleString()} km`,
        severity: 'medium',
        is_dismissed: false,
        created_at: now.toISOString(),
      });
    }
  } else {
    alerts.push({
      id: `oil-missing-${vehicle.id}`,
      vehicle_id: vehicle.id,
      type: 'oil_change',
      description: 'No hay registro de cambio de aceite. Registra el último realizado.',
      severity: 'low',
      is_dismissed: false,
      created_at: now.toISOString(),
    });
  }

  records.forEach((record) => {
    if (record.next_service_km && vehicle.current_km >= record.next_service_km) {
      alerts.push({
        id: `next-km-${record.id}`,
        vehicle_id: vehicle.id,
        type: 'scheduled_service',
        description: `Servicio programado: ${record.type} a ${record.next_service_km.toLocaleString()} km`,
        severity: 'high',
        is_dismissed: false,
        created_at: now.toISOString(),
      });
    }

    if (record.next_service_date) {
      const nextMs = new Date(record.next_service_date).getTime();
      if (nextMs < nowMs) {
        alerts.push({
          id: `next-date-${record.id}`,
          vehicle_id: vehicle.id,
          type: 'scheduled_service_date',
          description: `Servicio vencido: ${record.type} (fecha: ${new Date(record.next_service_date).toLocaleDateString('es-ES')})`,
          severity: 'high',
          is_dismissed: false,
          created_at: now.toISOString(),
        });
      }
    }
  });

  return alerts;
};

export const DOCUMENT_EXPIRY_WARN_DAYS = 30;

export const calculateDocumentAlerts = (vehicleId: string, documents: Document[]): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();
  const nowMs = now.getTime();
  const soonMs = nowMs + DOCUMENT_EXPIRY_WARN_DAYS * DAY_MS;

  for (const doc of documents) {
    if (!doc.expiry_date) continue;
    const expiry = new Date(doc.expiry_date);
    const expiryMs = expiry.getTime();
    const dateLabel = expiry.toLocaleDateString('es-ES');

    if (expiryMs < nowMs) {
      alerts.push({
        id: `doc-expired-${doc.id}`,
        vehicle_id: vehicleId,
        type: 'document_expired',
        description: `${doc.doc_type} caducado (venció el ${dateLabel})`,
        severity: 'high',
        is_dismissed: false,
        created_at: now.toISOString(),
      });
    } else if (expiryMs < soonMs) {
      alerts.push({
        id: `doc-soon-${doc.id}`,
        vehicle_id: vehicleId,
        type: 'document_expiring',
        description: `${doc.doc_type} vence pronto (${dateLabel})`,
        severity: 'medium',
        is_dismissed: false,
        created_at: now.toISOString(),
      });
    }
  }

  return alerts;
};

export const getNextServiceKm = (type: string, currentKm: number): number => {
  const intervals: Record<string, number> = {
    'Cambio de aceite': OIL_CHANGE_KM_INTERVAL,
    'Revisión general': GENERAL_SERVICE_KM_INTERVAL,
    'Filtro de aire': 20000,
    'Filtro de combustible': 30000,
    'Frenos delanteros': 40000,
    'Frenos traseros': 60000,
    Neumáticos: 40000,
    Batería: 80000,
    Bujías: 30000,
    'Correa de distribución': 80000,
  };
  const interval = intervals[type] ?? 10000;
  return currentKm + interval;
};
