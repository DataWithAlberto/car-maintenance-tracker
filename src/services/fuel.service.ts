import { supabase } from './supabase';
import type { FuelLog, CreateFuelLogInput } from '../types';

export const fuelService = {
  async getByVehicle(vehicleId: string): Promise<FuelLog[]> {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
      .order('km_at_fillup', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(vehicleId: string, userId: string, input: CreateFuelLogInput): Promise<FuelLog> {
    const { data, error } = await supabase
      .from('fuel_logs')
      .insert({
        vehicle_id: vehicleId,
        created_by: userId,
        date: input.date,
        km_at_fillup: input.km_at_fillup,
        liters: input.liters,
        price_per_liter: input.price_per_liter,
        station: input.station ?? null,
        full_tank: input.full_tank ?? true,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
    if (error) throw error;
  },
};
