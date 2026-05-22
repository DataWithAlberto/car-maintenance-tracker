import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Instancias únicas a nivel de módulo: Intl.NumberFormat es uno de los
// objetos más costosos de construir en V8 (carga ICU + negociación de
// locale). Reutilizarlas elimina cientos de allocations en renders con
// listas grandes o en exports.
const FMT_EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const FMT_KM = new Intl.NumberFormat('es-ES');
const currencyCache = new Map<string, Intl.NumberFormat>([['EUR', FMT_EUR]]);

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
};

export const formatDateLong = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "d 'de' MMMM yyyy", { locale: es });
};

export const formatRelative = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
};

export const formatCurrency = (amount: number, currency = 'EUR'): string => {
  let fmt = currencyCache.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency });
    currencyCache.set(currency, fmt);
  }
  return fmt.format(amount);
};

export const formatKm = (km: number): string => `${FMT_KM.format(km)} km`;
