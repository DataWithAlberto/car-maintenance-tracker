/**
 * Extrae un mensaje legible de cualquier error.
 *
 * Los errores de Supabase (PostgrestError, AuthError) NO son `instanceof Error`:
 * son objetos planos `{ message, code, details, hint }`. Esta función los
 * normaliza para poder mostrarlos al usuario en lugar de un texto genérico.
 */
export function getErrorMessage(err: unknown, fallback = 'Ha ocurrido un error'): string {
  if (!err) return fallback;

  if (typeof err === 'string') return err;

  if (err instanceof Error && err.message) return err.message;

  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof e.message === 'string' && e.message) parts.push(e.message);
    if (typeof e.details === 'string' && e.details && e.details !== e.message) {
      parts.push(e.details);
    }
    if (typeof e.hint === 'string' && e.hint) parts.push(`(${e.hint})`);
    if (typeof e.code === 'string' && e.code) parts.push(`[${e.code}]`);

    if (parts.length) return parts.join(' · ');
  }

  return fallback;
}
