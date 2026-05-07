import { supabase } from './supabase';
import type { Expense } from '../types';
import type { ExpenseInput } from '../utils/validators';

export const expensesService = {
  async getByVehicle(vehicleId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(vehicleId: string, userId: string, input: ExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...input, vehicle_id: vehicleId, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },
};
