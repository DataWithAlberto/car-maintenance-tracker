import { createClient } from '@supabase/supabase-js';
import { env } from '../config/environment';

// Service role client — bypasses RLS, server-side only
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Per-user client factory: uses the request's bearer token so RLS applies
export const supabaseForUser = (accessToken: string) =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
