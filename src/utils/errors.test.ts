import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('devuelve el fallback con un error nulo', () => {
    expect(getErrorMessage(null)).toBe('Ha ocurrido un error');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('devuelve la cadena tal cual si el error es un string', () => {
    expect(getErrorMessage('algo falló')).toBe('algo falló');
  });

  it('extrae el mensaje de un Error nativo', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('compone mensaje, detalle, hint y código de un error de Supabase', () => {
    const supabaseError = {
      message: 'duplicate key',
      details: 'ya existe',
      hint: 'usa otro id',
      code: '23505',
    };
    const msg = getErrorMessage(supabaseError);
    expect(msg).toContain('duplicate key');
    expect(msg).toContain('ya existe');
    expect(msg).toContain('usa otro id');
    expect(msg).toContain('23505');
  });

  it('usa el fallback con un objeto vacío', () => {
    expect(getErrorMessage({}, 'sin datos')).toBe('sin datos');
  });
});
