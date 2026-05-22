import { supabase } from './supabase';
import { MAX_ROWS_PER_QUERY } from '../utils/constants';
import type { Document } from '../types';

export const documentsService = {
  async getByVehicle(vehicleId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS_PER_QUERY);
    if (error) throw error;
    return data ?? [];
  },

  async create(
    vehicleId: string,
    userId: string,
    input: {
      doc_type: string;
      file_url: string;
      file_name?: string;
      expiry_date?: string;
      is_important?: boolean;
    },
  ): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert({ ...input, vehicle_id: vehicleId, uploaded_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
  },
};
