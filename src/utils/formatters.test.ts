import { describe, it, expect } from 'vitest';
import { formatKm, formatCurrency, formatDate } from './formatters';

describe('formatKm', () => {
  it('añade el sufijo km y agrupa los miles', () => {
    // El locale es-ES (CLDR minimumGroupingDigits=2) agrupa a partir de 5 dígitos.
    expect(formatKm(50000)).toBe('50.000 km');
    expect(formatKm(0)).toBe('0 km');
  });
});

describe('formatCurrency', () => {
  it('incluye el símbolo de euro y dos decimales', () => {
    const out = formatCurrency(1234.5);
    expect(out).toContain('€');
    expect(out).toContain('1234,50');
  });
});

describe('formatDate', () => {
  it('formatea una fecha ISO como dd/MM/yyyy', () => {
    expect(formatDate('2026-05-21')).toBe('21/05/2026');
  });
});
