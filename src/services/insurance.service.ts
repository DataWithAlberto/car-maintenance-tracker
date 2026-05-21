import { supabase } from './supabase';
import type { InsurancePolicy } from '../types';
import type { InsuranceInput } from '../utils/validators';

export const insuranceService = {
  async getByVehicle(vehicleId: string): Promise<InsurancePolicy[]> {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('end_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    vehicleId: string,
    userId: string,
    input: InsuranceInput,
  ): Promise<InsurancePolicy> {
    const { data, error } = await supabase
      .from('insurance_policies')
      .insert({ ...input, vehicle_id: vehicleId, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<InsuranceInput>): Promise<InsurancePolicy> {
    const { data, error } = await supabase
      .from('insurance_policies')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('insurance_policies').delete().eq('id', id);
    if (error) throw error;
  },
};
