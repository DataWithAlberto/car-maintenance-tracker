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
