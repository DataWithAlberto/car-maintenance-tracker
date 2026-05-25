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

export type InsurancePaymentFrequency = 'mensual' | 'trimestral' | 'semestral' | 'anual';

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

export type TripStatus = 'planning' | 'confirmed' | 'completed';

export interface Trip {
  id: string;
  vehicle_id: string;
  created_by: string;
  status: TripStatus;
  title?: string;
  start_location?: string;
  end_location?: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  start_datetime?: string;
  end_datetime?: string;
  start_date?: string;
  end_date?: string;
  estimated_budget?: number;
  start_km?: number;
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
  visibility: TripVisibility;
  is_surprise: boolean;
  surprise_config?: SurpriseConfig | null;
  created_at: string;
  updated_at: string;
  waypoints?: TripWaypoint[];
  activities?: TripActivity[];
  /** @deprecated alias — usar `activities`. */
  bookings?: TripActivity[];
}

export type TripVisibility = 'private' | 'public_link' | 'collaborative';
export type SurpriseAnimation = 'gift' | 'scratch' | 'envelope';

export interface SurpriseConfig {
  message?: string;
  reveal_date?: string;
  animation?: SurpriseAnimation;
}

export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  invited_by: string;
  created_at: string;
  user?: User;
}

export interface PublicTripPhoto {
  id: string;
  public_url: string;
  caption: string | null;
  taken_at: string | null;
  latitude: number | null;
  longitude: number | null;
  width: number | null;
  height: number | null;
  activity_id: string | null;
  created_at: string;
}

export interface PublicTripPayload {
  locked: false;
  trip: Trip;
  activities: TripActivity[];
  photos: PublicTripPhoto[];
}

// ─── Albums (vista agregada sobre galeria_imagenes vinculadas a un trip) ────

export interface TripAlbum {
  trip: Trip;
  cover_url: string | null;
  photo_count: number;
  last_photo_at: string | null;
}
export interface LockedSurprisePayload {
  locked: true;
  reveal_date: string;
  animation: SurpriseAnimation;
  message_preview: string;
}
export type PublicTripResponse = PublicTripPayload | LockedSurprisePayload;

// ─── Trip bookings ──────────────────────────────────────────────────────────

export type TripBookingType =
  | 'lodging'
  | 'museum'
  | 'activity'
  | 'restaurant'
  | 'transport'
  | 'ticket'
  | 'other';

export type TripBookingProvider =
  | 'booking'
  | 'airbnb'
  | 'vrbo'
  | 'hotels'
  | 'tripadvisor'
  | 'getyourguide'
  | 'civitatis'
  | 'standard';

export interface LodgingMetadata {
  address?: string;
  room_type?: string;
  guests?: number;
  rating?: number;
  photo_url?: string;
  check_in_time?: string;
  check_out_time?: string;
}

export interface ActivityMetadata {
  address?: string;
  meeting_point?: string;
  duration_min?: number;
  language?: string;
  audio_guide_lang?: string;
}

export type TripBookingMetadata = LodgingMetadata & ActivityMetadata & Record<string, unknown>;

export type TripActivityType = TripBookingType;
export type TripActivityProvider = TripBookingProvider;
export type TripActivityMetadata = TripBookingMetadata;

export interface TripActivity {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  type: TripActivityType;
  provider: TripActivityProvider;
  start_datetime: string;
  end_datetime?: string;
  price?: number;
  currency?: string;
  booking_url?: string;
  confirmation_code?: string;
  notes?: string;
  metadata: TripActivityMetadata;
  is_candidate: boolean;
  is_confirmed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/** @deprecated alias retro-compatible — usar TripActivity. */
export type TripBooking = TripActivity;

export interface TripChecklistItem {
  id: string;
  trip_id: string;
  created_by: string;
  text: string;
  done: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDraftTripInput {
  title?: string;
  end_location: string;
  estimated_budget?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface CreateTripActivityInput {
  title: string;
  type: TripActivityType;
  provider: TripActivityProvider;
  start_datetime: string;
  end_datetime?: string;
  price?: number;
  currency?: string;
  booking_url?: string;
  confirmation_code?: string;
  notes?: string;
  metadata?: TripActivityMetadata;
  is_candidate?: boolean;
  order_index?: number;
}

/** @deprecated alias retro-compatible — usar CreateTripActivityInput. */
export type CreateTripBookingInput = CreateTripActivityInput;

// ─── Mechanics (Talleres recomendados por IA) ───────────────────────────────

export interface Mechanic {
  id: string; // OSM element id (e.g. "node/123")
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  brand?: string; // marca en la que se especializa, si la hay
  openingHours?: string;
  distanceKm: number; // distancia al punto de búsqueda
}

export interface MechanicRecommendation {
  mechanicId: string;
  reason: string;
  urgency: AlertSeverity;
}

export interface Diagnosis {
  summary: string; // diagnóstico del problema
  likelyCause: string; // causa más probable
  urgency: AlertSeverity; // urgencia general
  estimatedService: string; // servicio que necesita el coche
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

// ─── OBD2 ────────────────────────────────────────────────────────────────────

export type AnomalySeverity = 'warn' | 'critical';

export interface OBD2Reading {
  id?: string;
  vehicle_id?: string;
  timestamp?: number; // Unix timestamp
  rpm: number | null;
  speed: number | null;
  coolant_temp: number | null;
  fuel_level: number | null;
  odometer: number | null;
  oil_pressure: number | null;
  battery_voltage: number | null;
  engine_load: number | null;
  timing_advance: number | null;
  engine_runtime: number | null;
  maf_air_flow: number | null;
  fuel_trim_bank1: number | null;
  fuel_rate: number | null;
  short_term_fuel_trim_1: number | null;
  long_term_fuel_trim_1: number | null;
  intake_manifold_pressure: number | null;
  absolute_load: number | null;
  relative_throttle_pos: number | null;
  ambient_air_temp: number | null;
  abs_throttle_pos_b: number | null;
  acc_pedal_pos_d: number | null;
  acc_pedal_pos_e: number | null;
  catalyst_temp_bank1_sensor1: number | null;
  num_emissions_dtc: number | null;
  created_at?: string;
}

export interface OBD2Anomaly {
  id?: string;
  vehicle_id?: string;
  reading_id?: string;
  type:
    | 'overtemp'
    | 'high_rpms'
    | 'low_battery'
    | 'low_fuel'
    | 'oil_pressure_low'
    | 'engine_load_high'
    | 'other';
  severity: AnomalySeverity;
  value: number;
  threshold: number;
  message: string;
  dismissed?: boolean;
  created_at?: string;
}
