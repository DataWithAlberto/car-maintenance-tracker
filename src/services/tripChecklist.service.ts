import { supabase } from './supabase';
import type { TripChecklistItem } from '../types';

export const tripChecklistService = {
  async getByTrip(tripId: string): Promise<TripChecklistItem[]> {
    const { data, error } = await supabase
      .from('trip_checklist_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    tripId: string,
    userId: string,
    text: string,
    orderIndex = 0,
  ): Promise<TripChecklistItem> {
    const { data, error } = await supabase
      .from('trip_checklist_items')
      .insert({ trip_id: tripId, created_by: userId, text, order_index: orderIndex })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggle(id: string, done: boolean): Promise<void> {
    const { error } = await supabase.from('trip_checklist_items').update({ done }).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('trip_checklist_items').delete().eq('id', id);
    if (error) throw error;
  },
};
