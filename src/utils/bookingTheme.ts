import type { TripBookingProvider, TripBookingType } from '../types';

export interface BookingTheme {
  surface: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  textPrimary: string;
  textMuted: string;
  radius: number;
  badgeShape: 'rounded' | 'square' | 'pill';
  label: string;
  fontFamily: string;
}

const STANDARD: BookingTheme = {
  surface: 'var(--color-snow)',
  border: 'var(--color-silver-mist)',
  accent: 'var(--color-ink)',
  accentSoft: 'var(--color-fog)',
  onAccent: 'var(--color-snow)',
  textPrimary: 'var(--color-ink)',
  textMuted: 'var(--color-graphite)',
  radius: 18,
  badgeShape: 'pill',
  label: 'Standard',
  fontFamily: 'Inter, var(--font-sf-pro-display)',
};

const BOOKING: BookingTheme = {
  surface: '#ffffff',
  border: '#003580',
  accent: '#003580',
  accentSoft: '#e7f0ff',
  onAccent: '#febb02',
  textPrimary: '#003580',
  textMuted: '#1a3d80',
  radius: 6,
  badgeShape: 'square',
  label: 'Booking.com',
  fontFamily: '"BlinkMacSystemFont","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
};

const AIRBNB: BookingTheme = {
  surface: '#ffffff',
  border: '#EBEBEB',
  accent: '#FF5A5F',
  accentSoft: '#FFF1F2',
  onAccent: '#ffffff',
  textPrimary: '#222222',
  textMuted: '#717171',
  radius: 24,
  badgeShape: 'rounded',
  label: 'Airbnb',
  fontFamily: '"Cereal","Circular",Inter,system-ui,sans-serif',
};

const PROVIDER_THEMES: Record<TripBookingProvider, BookingTheme> = {
  booking: BOOKING,
  airbnb: AIRBNB,
  vrbo: { ...STANDARD, accent: '#245ABC', label: 'Vrbo' },
  hotels: { ...STANDARD, accent: '#D32F2F', label: 'Hotels.com' },
  tripadvisor: { ...STANDARD, accent: '#34E0A1', label: 'Tripadvisor' },
  getyourguide: { ...STANDARD, accent: '#FF6B00', label: 'GetYourGuide' },
  civitatis: { ...STANDARD, accent: '#E60023', label: 'Civitatis' },
  standard: STANDARD,
};

export const getBookingTheme = (provider: TripBookingProvider): BookingTheme =>
  PROVIDER_THEMES[provider] ?? STANDARD;

export const BOOKING_TYPE_LABEL: Record<TripBookingType, string> = {
  lodging: 'Alojamiento',
  museum: 'Museo',
  activity: 'Actividad',
  restaurant: 'Restaurante',
  transport: 'Transporte',
  ticket: 'Entrada',
  other: 'Otro',
};

export const LODGING_PROVIDERS: TripBookingProvider[] = [
  'booking',
  'airbnb',
  'vrbo',
  'hotels',
  'standard',
];

export const ACTIVITY_PROVIDERS: TripBookingProvider[] = [
  'getyourguide',
  'civitatis',
  'tripadvisor',
  'standard',
];
