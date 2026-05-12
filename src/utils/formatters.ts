import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatKm = (km: number): string => {
  return new Intl.NumberFormat('es-ES').format(km) + ' km';
};
