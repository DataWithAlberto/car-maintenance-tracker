import { supabase } from './supabase';
import type { Vehicle, MaintenanceRecord, Expense, Document } from '../types';

export interface WorkshopView {
  vehicle: Vehicle;
  records: MaintenanceRecord[];
  expenses: Expense[];
  documents: Document[];
}

export const workshopService = {
  /** Fetches a read-only vehicle history via the public share token (anon access). */
  async getView(token: string): Promise<WorkshopView | null> {
    const { data, error } = await supabase.rpc('get_workshop_view', { p_token: token });
    if (error) throw error;
    return (data as WorkshopView | null) ?? null;
  },
};
