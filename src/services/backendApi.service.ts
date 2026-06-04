import { supabase } from './supabase';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

interface BackendRequestOptions {
  signal?: AbortSignal;
}

export const backendApi = {
  get configured(): boolean {
    return API_BASE.length > 0;
  },

  async post<T>(
    path: string,
    payload: unknown,
    { signal }: BackendRequestOptions = {},
  ): Promise<T> {
    if (!API_BASE) throw new Error('VITE_API_URL no está configurada');

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sesión no disponible para llamar al backend');

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? body?.error ?? `Backend respondió ${res.status}`);
    }

    return res.json();
  },
};
