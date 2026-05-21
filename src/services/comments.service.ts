import { supabase } from './supabase';
import type { MaintenanceComment } from '../types';

export const commentsService = {
  async getByRecord(recordId: string): Promise<MaintenanceComment[]> {
    const { data, error } = await supabase
      .from('maintenance_comments')
      .select('*, user:users(email, full_name)')
      .eq('maintenance_record_id', recordId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MaintenanceComment[];
  },

  async create(recordId: string, userId: string, text: string): Promise<MaintenanceComment> {
    const { data, error } = await supabase
      .from('maintenance_comments')
      .insert({ maintenance_record_id: recordId, user_id: userId, text })
      .select('*, user:users(email, full_name)')
      .single();
    if (error) throw error;
    return data as MaintenanceComment;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('maintenance_comments').delete().eq('id', id);
    if (error) throw error;
  },
};
