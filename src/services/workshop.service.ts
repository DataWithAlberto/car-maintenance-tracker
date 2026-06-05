import { supabase } from './supabase';
import type {
  Document,
  InsuranceCoverage,
  InsurancePaymentFrequency,
  MaintenanceRecord,
  OBD2Anomaly,
  OBD2Reading,
  Vehicle,
} from '../types';

export type WorkshopVehicle = Pick<
  Vehicle,
  | 'id'
  | 'brand'
  | 'model'
  | 'year'
  | 'license_plate'
  | 'fuel_type'
  | 'transmission'
  | 'current_km'
  | 'vin'
  | 'updated_at'
>;

export type WorkshopMaintenanceRecord = Pick<
  MaintenanceRecord,
  | 'id'
  | 'type'
  | 'date'
  | 'km_at_service'
  | 'description'
  | 'parts_location'
  | 'next_service_km'
  | 'next_service_date'
>;

export type WorkshopDocument = Pick<
  Document,
  'id' | 'doc_type' | 'file_url' | 'file_name' | 'expiry_date' | 'is_important' | 'created_at'
>;

export interface WorkshopInsurance {
  id: string;
  provider: string;
  coverage_type: InsuranceCoverage;
  payment_frequency?: InsurancePaymentFrequency;
  start_date: string;
  end_date: string;
  contact_phone?: string;
}

export interface WorkshopOBD2 {
  latest: OBD2Reading | null;
  readings: OBD2Reading[];
  anomalies: OBD2Anomaly[];
}

export interface WorkshopView {
  vehicle: WorkshopVehicle;
  records: WorkshopMaintenanceRecord[];
  documents: WorkshopDocument[];
  insurance: WorkshopInsurance | null;
  obd2: WorkshopOBD2;
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const normalizeWorkshopView = (value: unknown): WorkshopView | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<WorkshopView>;
  if (!raw.vehicle) return null;

  return {
    vehicle: raw.vehicle,
    records: asArray<WorkshopMaintenanceRecord>(raw.records),
    documents: asArray<WorkshopDocument>(raw.documents).filter((d) => d.is_important !== false),
    insurance: raw.insurance ?? null,
    obd2: {
      latest: raw.obd2?.latest ?? null,
      readings: asArray<OBD2Reading>(raw.obd2?.readings),
      anomalies: asArray<OBD2Anomaly>(raw.obd2?.anomalies).filter((a) => !a.dismissed),
    },
  };
};

export const workshopService = {
  /** Fetches the public read-only technical dossier via vehicle share token. */
  async getView(token: string): Promise<WorkshopView | null> {
    const { data, error } = await supabase.rpc('get_workshop_view', { p_token: token });
    if (error) throw error;
    return normalizeWorkshopView(data);
  },
};
