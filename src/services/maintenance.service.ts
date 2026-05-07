import { supabase } from './supabase';
import type { MaintenanceRecord } from '../types';
import type { MaintenanceInput } from '../utils/validators';

export const maintenanceService = {
  async getByVehicle(vehicleId: string): Promise<MaintenanceRecord[]> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*, maintenance_attachments(*)')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, attachments: r.maintenance_attachments }));
  },

  async create(vehicleId: string, userId: string, input: MaintenanceInput): Promise<MaintenanceRecord> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert({ ...input, vehicle_id: vehicleId, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<MaintenanceInput>): Promise<MaintenanceRecord> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('maintenance_records').delete().eq('id', id);
    if (error) throw error;
  },
};
