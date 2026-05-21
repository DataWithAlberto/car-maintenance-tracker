import { supabase } from './supabase';
import type { RegisterInput, LoginInput } from '../utils/validators';

export const authService = {
  async register({ email, password, full_name }: RegisterInput) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        full_name,
      });
    }

    return data;
  },

  async login({ email, password }: LoginInput) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
