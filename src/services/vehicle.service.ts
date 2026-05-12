import { supabase } from './supabase';
import type { Vehicle, VehicleWithAccess } from '../types';
import type { VehicleInput } from '../utils/validators';

export const vehicleService = {
  async getAll(userId: string): Promise<VehicleWithAccess[]> {
    const { data: owned, error: e1 } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (e1) throw e1;

    const { data: shared, error: e2 } = await supabase
      .from('shared_access')
      .select('*, vehicles(*)')
      .eq('user_id', userId)
      .eq('status', 'accepted');
    if (e2) throw e2;

    const ownedWithRole = (owned ?? []).map((v) => ({ ...v, role: 'owner' as const }));

    const sharedWithRole = (shared ?? [])
      .filter((s) => s.vehicles)
      .map((s) => ({ ...(s.vehicles as Vehicle), role: s.role as 'editor' | 'viewer' }));

    return [...ownedWithRole, ...sharedWithRole];
  },

  async getById(id: string): Promise<Vehicle> {
    const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create(userId: string, input: VehicleInput): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ ...input, owner_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
  },
};
