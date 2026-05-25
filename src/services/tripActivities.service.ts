import { supabase } from './supabase';
import type { TripActivity, CreateTripActivityInput } from '../types';

export const tripActivitiesService = {
  async getByTrip(tripId: string): Promise<TripActivity[]> {
    const { data, error } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_datetime', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    tripId: string,
    userId: string,
    input: CreateTripActivityInput,
  ): Promise<TripActivity> {
    const { data, error } = await supabase
      .from('trip_activities')
      .insert({
        ...input,
        metadata: input.metadata ?? {},
        trip_id: tripId,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: Partial<CreateTripActivityInput>): Promise<TripActivity> {
    const { data, error } = await supabase
      .from('trip_activities')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('trip_activities').delete().eq('id', id);
    if (error) throw error;
  },
};

/** @deprecated alias retro-compatible. */
export const tripBookingsService = tripActivitiesService;
