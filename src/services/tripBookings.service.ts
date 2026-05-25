import { supabase } from './supabase';
import type { TripBooking, CreateTripBookingInput } from '../types';

export const tripBookingsService = {
  async getByTrip(tripId: string): Promise<TripBooking[]> {
    const { data, error } = await supabase
      .from('trip_bookings')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_datetime', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    tripId: string,
    userId: string,
    input: CreateTripBookingInput,
  ): Promise<TripBooking> {
    const { data, error } = await supabase
      .from('trip_bookings')
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

  async update(id: string, input: Partial<CreateTripBookingInput>): Promise<TripBooking> {
    const { data, error } = await supabase
      .from('trip_bookings')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('trip_bookings').delete().eq('id', id);
    if (error) throw error;
  },
};
