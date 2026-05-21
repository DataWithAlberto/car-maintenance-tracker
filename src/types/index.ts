export type UserRole = 'owner' | 'editor' | 'viewer';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type SharedAccessStatus = 'pending' | 'accepted' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate?: string;
  color?: string;
  fuel_type?: string;
  transmission?: string;
  current_km: number;
  vin?: string;
  model_3d_url?: string;
  share_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  created_by: string;
  type: string;
  date: string;
  km_at_service: number;
  cost?: number;
  description?: string;
  parts_location?: string;
  next_service_km?: number;
  next_service_date?: string;
  created_at: string;
  updated_at: string;
  attachments?: MaintenanceAttachment[];
}

export interface MaintenanceAttachment {
  id: string;
  maintenance_record_id: string;
  file_url: string;
  file_name?: string;
  uploaded_at: string;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  created_by: string;
  category: string;
  date: string;
  amount: number;
  description?: string;
  receipt_url?: string;
  created_at: string;
}

export interface Document {
  id: string;
  vehicle_id: string;
  uploaded_by: string;
  doc_type: string;
  file_url: string;
  file_name?: string;
  expiry_date?: string;
  is_important: boolean;
  created_at: string;
}

export type InsuranceCoverage =
  | 'terceros'
  | 'terceros_ampliado'
  | 'todo_riesgo'
  | 'todo_riesgo_franquicia';

export type InsurancePaymentFrequency =
  | 'mensual'
  | 'trimestral'
  | 'semestral'
  | 'anual';

export interface InsurancePolicy {
  id: string;
  vehicle_id: string;
  created_by: string;
  provider: string;
  policy_number?: string;
  coverage_type: InsuranceCoverage;
  premium_amount?: number;
  payment_frequency?: InsurancePaymentFrequency;
  start_date: string;
  end_date: string;
  deductible?: number;
  contact_phone?: string;
  document_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SharedAccess {
  id: string;
  vehicle_id: string;
  user_id: string;
  role: UserRole;
  status: SharedAccessStatus;
  created_at: string;
  user?: User;
}

export interface Alert {
  id: string;
  vehicle_id: string;
  type: string;
  description: string;
  severity?: AlertSeverity;
  is_dismissed: boolean;
  created_at: string;
}

export interface VehicleWithAccess extends Vehicle {
  role: UserRole;
  shared_access?: SharedAccess[];
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export interface TripWaypoint {
  id: string;
  trip_id: string;
  lat: number;
  lng: number;
  name?: string;
  description?: string;
  photo_url?: string;
  order_index: number;
  created_at: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  created_by: string;
  title?: string;
  start_location: string;
  end_location: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  start_datetime: string;
  end_datetime?: string;
  start_km: number;
  end_km?: number;
  total_km?: number;
  fuel_consumed?: number;
  avg_speed?: number;
  max_altitude?: number;
  driving_time_minutes?: number;
  notes?: string;
  weather_condition?: string;
  weather_temp?: number;
  weather_humidity?: number;
  weather_wind_speed?: number;
  spotify_playlist_url?: string;
  share_token?: string;
  created_at: string;
  updated_at: string;
  waypoints?: TripWaypoint[];
}

// ─── Mechanics (Talleres recomendados por IA) ───────────────────────────────

export interface Mechanic {
  id: string;            // OSM element id (e.g. "node/123")
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  brand?: string;        // marca en la que se especializa, si la hay
  openingHours?: string;
  distanceKm: number;    // distancia al punto de búsqueda
}

export interface MechanicRecommendation {
  mechanicId: string;
  reason: string;
  urgency: AlertSeverity;
}

export interface Diagnosis {
  summary: string;            // diagnóstico del problema
  likelyCause: string;        // causa más probable
  urgency: AlertSeverity;     // urgencia general
  estimatedService: string;   // servicio que necesita el coche
  recommendations: MechanicRecommendation[]; // talleres ordenados por idoneidad
}

export interface ReceiptScan {
  amount?: number;
  date?: string;
  category?: string;
  description?: string;
}

export interface MaintenanceInsight {
  title: string;
  detail: string;
  severity: AlertSeverity;
}

export type FailureStatus = 'ok' | 'soon' | 'overdue';

export interface FailurePrediction {
  key: string;
  label: string;
  lifespanKm: number;
  lastServiceKm: number | null;
  predictedKm: number;
  kmRemaining: number;
  lifeUsedPct: number;
  status: FailureStatus;
}

// ─── Fuel Logs ────────────────────────────────────────────────────────────────

export interface FuelLog {
  id: string;
  vehicle_id: string;
  created_by: string;
  date: string;
  km_at_fillup: number;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  station?: string;
  full_tank: boolean;
  notes?: string;
  created_at: string;
}

export interface CreateFuelLogInput {
  date: string;
  km_at_fillup: number;
  liters: number;
  price_per_liter: number;
  station?: string;
  full_tank?: boolean;
  notes?: string;
}

// ─── Maintenance Comments ─────────────────────────────────────────────────────

export interface MaintenanceComment {
  id: string;
  maintenance_record_id: string;
  user_id: string;
  text: string;
  created_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export type AchievementCategory = 'mantenimiento' | 'viajes' | 'economia' | 'social' | 'especial';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
  xp: number;
}

export interface CreateTripInput {
  title?: string;
  start_location: string;
  end_location: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  start_datetime: string;
  end_datetime?: string;
  start_km: number;
  end_km?: number;
  fuel_consumed?: number;
  avg_speed?: number;
  max_altitude?: number;
  driving_time_minutes?: number;
  notes?: string;
  weather_condition?: string;
  weather_temp?: number;
  weather_humidity?: number;
  weather_wind_speed?: number;
  spotify_playlist_url?: string;
}
