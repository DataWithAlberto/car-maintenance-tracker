import { supabase } from './supabase';
import type { SharedAccess, UserRole } from '../types';

export const sharingService = {
  async getByVehicle(vehicleId: string): Promise<SharedAccess[]> {
    const { data, error } = await supabase
      .from('shared_access')
      .select('*, users(*)')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((s) => ({ ...s, user: s.users }));
  },

  async invite(vehicleId: string, email: string, role: UserRole): Promise<{ token: string; existing: boolean }> {
    // Localiza al usuario por email vía RPC: la tabla `users` ya no es
    // legible en bloque (migración 20260522_harden_rls_and_indexes).
    const { data: existingUserId, error: lookupError } = await supabase
      .rpc('find_user_id_by_email', { lookup_email: email });
    if (lookupError) throw lookupError;

    if (existingUserId) {
      // User exists — invite directly
      const { data, error } = await supabase
        .from('shared_access')
        .upsert(
          { vehicle_id: vehicleId, user_id: existingUserId, role, status: 'pending', invited_email: email },
          { onConflict: 'vehicle_id,user_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return { token: data.invite_token, existing: true };
    } else {
      // User not registered — create pending invite with email only
      const { data, error } = await supabase
        .from('shared_access')
        .insert({
          vehicle_id: vehicleId,
          user_id: null,
          role,
          status: 'pending',
          invited_email: email,
        })
        .select()
        .single();
      if (error) throw error;
      return { token: data.invite_token, existing: false };
    }
  },

  async getInviteByToken(token: string) {
    const { data, error } = await supabase
      .from('shared_access')
      .select('*, vehicles(brand, model, year, owner_id)')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async acceptInviteByToken(token: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('shared_access')
      .update({ status: 'accepted', user_id: userId })
      .eq('invite_token', token);
    if (error) throw error;
  },

  async respondInvite(id: string, accept: boolean): Promise<void> {
    const { error } = await supabase
      .from('shared_access')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('shared_access').delete().eq('id', id);
    if (error) throw error;
  },

  async getPendingInvites(userId: string): Promise<SharedAccess[]> {
    const { data, error } = await supabase
      .from('shared_access')
      .select('*, vehicles(brand, model, year)')
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return data ?? [];
  },
};
