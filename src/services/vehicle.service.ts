import { supabase } from './supabase';
import type { Vehicle, VehicleWithAccess } from '../types';
import type { VehicleInput } from '../utils/validators';

export const vehicleService = {
  async getAll(userId: string): Promise<VehicleWithAccess[]> {
    // Las dos consultas son independientes: se lanzan en paralelo para no
    // sumar latencias de red.
    const [ownedRes, sharedRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('shared_access')
        .select('*, vehicles(*)')
        .eq('user_id', userId)
        .eq('status', 'accepted'),
    ]);
    if (ownedRes.error) throw ownedRes.error;
    if (sharedRes.error) throw sharedRes.error;

    const ownedWithRole = (ownedRes.data ?? []).map((v) => ({ ...v, role: 'owner' as const }));

    const sharedWithRole = (sharedRes.data ?? [])
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

  async setShareToken(id: string): Promise<string> {
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from('vehicles')
      .update({ share_token: token })
      .eq('id', id);
    if (error) throw error;
    return token;
  },

  async clearShareToken(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .update({ share_token: null })
      .eq('id', id);
    if (error) throw error;
  },
};
