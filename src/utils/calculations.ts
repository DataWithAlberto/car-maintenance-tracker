import { addMonths, addDays, parseISO, isBefore } from 'date-fns';
import type { MaintenanceRecord, Vehicle, Alert, Document } from '../types';
import { OIL_CHANGE_KM_INTERVAL, OIL_CHANGE_MONTH_INTERVAL, GENERAL_SERVICE_KM_INTERVAL } from './constants';

export const calculateAlerts = (vehicle: Vehicle, records: MaintenanceRecord[]): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();

  const lastOilChange = records
    .filter((r) => r.type === 'Cambio de aceite')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (lastOilChange) {
    const kmDiff = vehicle.current_km - lastOilChange.km_at_service;
    const nextDate = addMonths(parseISO(lastOilChange.date), OIL_CHANGE_MONTH_INTERVAL);

    if (kmDiff >= OIL_CHANGE_KM_INTERVAL || isBefore(nextDate, now)) {
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
      const nextDate = parseISO(record.next_service_date);
      if (isBefore(nextDate, now)) {
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
  const soon = addDays(now, DOCUMENT_EXPIRY_WARN_DAYS);

  documents.forEach((doc) => {
    if (!doc.expiry_date) return;
    const expiry = parseISO(doc.expiry_date);
    const dateLabel = expiry.toLocaleDateString('es-ES');

    if (isBefore(expiry, now)) {
      alerts.push({
        id: `doc-expired-${doc.id}`,
        vehicle_id: vehicleId,
        type: 'document_expired',
        description: `${doc.doc_type} caducado (venció el ${dateLabel})`,
        severity: 'high',
        is_dismissed: false,
        created_at: now.toISOString(),
      });
    } else if (isBefore(expiry, soon)) {
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
  });

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
