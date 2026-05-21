// withRetry — reintenta una promesa con backoff exponencial.
//
// Pensado para llamadas de red que pueden fallar de forma intermitente
// (Supabase, fetch a APIs externas). No reintenta errores 4xx (peticiones
// mal formadas / auth) si se le pasa `isRetryable`.

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
}

const defaultRetryable = (err: unknown): boolean => {
  if (err instanceof TypeError) return true; // network error
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch')) return true;
  return false;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, baseDelayMs = 400, isRetryable = defaultRetryable }: RetryOptions = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}
