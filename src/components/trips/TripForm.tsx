import { useState, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Calendar,
  Gauge,
  Wind,
  Thermometer,
  Music,
  StickyNote,
  Loader2,
  LocateFixed,
  Clock,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { FloatingInput, FloatingTextarea, FloatingSelect } from '../ui/FloatingInput';
import { Button } from '../ui/Button';
import { tripsService } from '../../services/trips.service';
import type { CreateTripInput, Trip } from '../../types';

interface TripFormProps {
  currentKm: number;
  initialData?: Partial<Trip>;
  mode?: 'create' | 'edit';
  onSubmit: (data: TripFormValues) => Promise<void>;
  onClose: () => void;
}

export type TripFormValues = CreateTripInput & {
  estimated_budget?: number;
};

const toLocalDatetimeString = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const SectionHeader = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <p
    className="font-mono uppercase text-graphite flex items-center gap-1.5"
    style={{ fontSize: 11, letterSpacing: '0.12em' }}
  >
    {icon} {children}
  </p>
);

const toDatetimeInputValue = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 16);
  return toLocalDatetimeString(parsed);
};

export const TripForm = ({
  currentKm,
  initialData,
  mode = 'create',
  onSubmit,
  onClose,
}: TripFormProps) => {
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [form, setForm] = useState<TripFormValues>({
    title: initialData?.title ?? undefined,
    start_location: initialData?.start_location ?? '',
    end_location: initialData?.end_location ?? '',
    start_lat: initialData?.start_lat ?? undefined,
    start_lng: initialData?.start_lng ?? undefined,
    end_lat: initialData?.end_lat ?? undefined,
    end_lng: initialData?.end_lng ?? undefined,
    start_datetime:
      toDatetimeInputValue(initialData?.start_datetime) || toLocalDatetimeString(new Date()),
    end_datetime: toDatetimeInputValue(initialData?.end_datetime) || undefined,
    start_km: initialData?.start_km ?? currentKm,
    end_km: initialData?.end_km ?? undefined,
    fuel_consumed: initialData?.fuel_consumed ?? undefined,
    avg_speed: initialData?.avg_speed ?? undefined,
    max_altitude: initialData?.max_altitude ?? undefined,
    driving_time_minutes: initialData?.driving_time_minutes ?? undefined,
    notes: initialData?.notes ?? undefined,
    weather_condition: initialData?.weather_condition ?? undefined,
    weather_temp: initialData?.weather_temp ?? undefined,
    weather_humidity: initialData?.weather_humidity ?? undefined,
    weather_wind_speed: initialData?.weather_wind_speed ?? undefined,
    spotify_playlist_url: initialData?.spotify_playlist_url ?? undefined,
    estimated_budget: initialData?.estimated_budget ?? undefined,
  });

  const set = (k: keyof TripFormValues, v: string | number | undefined) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          start_lat: pos.coords.latitude,
          start_lng: pos.coords.longitude,
        }));
        setGeoLoading(false);
        // Auto-fetch weather
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => setGeoLoading(false),
      { timeout: 8000 },
    );
  };

  const fetchWeather = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    const w = await tripsService.fetchWeather(lat, lng);
    if (w) setForm((f) => ({ ...f, ...w }));
    setWeatherLoading(false);
  };

  // Derived: driving time from the two datetimes (no effect / no extra state).
  const drivingTimeMinutes = useMemo(() => {
    if (form.start_datetime && form.end_datetime) {
      const diff =
        (new Date(form.end_datetime).getTime() - new Date(form.start_datetime).getTime()) / 60000;
      if (diff > 0) return Math.round(diff);
    }
    return undefined;
  }, [form.start_datetime, form.end_datetime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ ...form, driving_time_minutes: drivingTimeMinutes });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate total km
  const totalKm =
    form.end_km != null && form.end_km > form.start_km ? form.end_km - form.start_km : null;

  const weatherConditions = [
    'Clear',
    'Clouds',
    'Rain',
    'Drizzle',
    'Thunderstorm',
    'Snow',
    'Mist',
    'Fog',
    'Haze',
    'Windy',
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'edit' ? 'Editar viaje' : 'Registrar viaje'}
      description={
        mode === 'edit'
          ? 'Actualiza ruta, fechas, consumo, presupuesto y notas'
          : 'Documenta tu ruta y experiencia de conducción'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Locations */}
        <div className="space-y-3">
          <SectionHeader icon={<Navigation className="h-3 w-3" strokeWidth={1.6} />}>
            Ruta
          </SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <FloatingInput
                label="Punto de inicio"
                value={form.start_location}
                onChange={(e) => set('start_location', e.target.value)}
                required
              />
            </div>
            <FloatingInput
              label="Punto de fin"
              value={form.end_location}
              onChange={(e) => set('end_location', e.target.value)}
              required
            />
          </div>
          <FloatingInput
            label="Título del viaje (opcional)"
            value={form.title ?? ''}
            onChange={(e) => set('title', e.target.value || undefined)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGeolocate}
              loading={geoLoading}
              iconLeft={<LocateFixed className="h-3.5 w-3.5" />}
            >
              {form.start_lat != null
                ? `${form.start_lat.toFixed(4)}, ${form.start_lng?.toFixed(4)}`
                : 'Usar mi ubicación'}
            </Button>
            {form.start_lat != null && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fetchWeather(form.start_lat!, form.start_lng!)}
                loading={weatherLoading}
                iconLeft={<Thermometer className="h-3.5 w-3.5" />}
              >
                Obtener clima
              </Button>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-3">
          <SectionHeader icon={<Calendar className="h-3 w-3" strokeWidth={1.6} />}>
            Fecha y hora
          </SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FloatingInput
              type="datetime-local"
              label="Inicio"
              value={form.start_datetime}
              onChange={(e) => set('start_datetime', e.target.value)}
              required
            />
            <FloatingInput
              type="datetime-local"
              label="Fin (opcional)"
              value={form.end_datetime ?? ''}
              onChange={(e) => set('end_datetime', e.target.value || undefined)}
            />
          </div>
          {drivingTimeMinutes != null && (
            <p
              className="font-text text-graphite flex items-center gap-1.5"
              style={{ fontSize: 13 }}
            >
              <Clock className="h-3 w-3" strokeWidth={1.6} />
              Tiempo de conducción: {Math.floor(drivingTimeMinutes / 60)}h {drivingTimeMinutes % 60}
              min
            </p>
          )}
        </div>

        {/* Odometer */}
        <div className="space-y-3">
          <SectionHeader icon={<Gauge className="h-3 w-3" strokeWidth={1.6} />}>
            Odómetro
          </SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FloatingInput
              type="number"
              label="Km al salir"
              value={form.start_km}
              onChange={(e) => set('start_km', parseInt(e.target.value) || 0)}
              required
            />
            <FloatingInput
              type="number"
              label="Km al llegar"
              value={form.end_km ?? ''}
              onChange={(e) => set('end_km', parseInt(e.target.value) || undefined)}
            />
            <div className="flex items-center px-4 bg-fog border border-silver-mist rounded-[14px]">
              <div>
                <p
                  className="font-mono uppercase text-graphite"
                  style={{ fontSize: 10, letterSpacing: '0.12em' }}
                >
                  Total
                </p>
                <p
                  className="font-text text-ink font-medium tabular-nums mt-0.5"
                  style={{ fontSize: 15 }}
                >
                  {totalKm != null ? `${totalKm} km` : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FloatingInput
              type="number"
              label="Combustible consumido (L)"
              value={form.fuel_consumed ?? ''}
              onChange={(e) => set('fuel_consumed', parseFloat(e.target.value) || undefined)}
            />
            <FloatingInput
              type="number"
              label="Velocidad media (km/h)"
              value={form.avg_speed ?? ''}
              onChange={(e) => set('avg_speed', parseFloat(e.target.value) || undefined)}
            />
          </div>
          <FloatingInput
            type="number"
            label="Altitud máxima (m)"
            value={form.max_altitude ?? ''}
            onChange={(e) => set('max_altitude', parseFloat(e.target.value) || undefined)}
          />
        </div>

        {/* Budget */}
        <div className="space-y-3">
          <SectionHeader icon={<Wallet className="h-3 w-3" strokeWidth={1.6} />}>
            Presupuesto
          </SectionHeader>
          <FloatingInput
            type="number"
            label="Presupuesto estimado (€)"
            value={form.estimated_budget ?? ''}
            onChange={(e) => set('estimated_budget', parseFloat(e.target.value) || undefined)}
          />
        </div>

        {/* Weather */}
        <div className="space-y-3">
          <SectionHeader icon={<Wind className="h-3 w-3" strokeWidth={1.6} />}>
            Condiciones climáticas
            {weatherLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <FloatingSelect
                label="Clima (opcional)"
                value={form.weather_condition ?? ''}
                onChange={(e) => set('weather_condition', e.target.value || undefined)}
                options={[
                  { value: '', label: '—' },
                  ...weatherConditions.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <FloatingInput
              type="number"
              label="Temp (°C)"
              value={form.weather_temp ?? ''}
              onChange={(e) => set('weather_temp', parseFloat(e.target.value) || undefined)}
            />
            <FloatingInput
              type="number"
              label="Viento (km/h)"
              value={form.weather_wind_speed ?? ''}
              onChange={(e) => set('weather_wind_speed', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>

        {/* Extras */}
        <div className="space-y-3">
          <SectionHeader icon={<StickyNote className="h-3 w-3" strokeWidth={1.6} />}>
            Notas y extras
          </SectionHeader>
          <FloatingTextarea
            label="Notas del viaje"
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value || undefined)}
            rows={3}
          />
          <FloatingInput
            label="URL playlist de Spotify (opcional)"
            value={form.spotify_playlist_url ?? ''}
            onChange={(e) => set('spotify_playlist_url', e.target.value || undefined)}
            iconLeft={<Music className="h-4 w-4" />}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} iconLeft={<MapPin className="h-4 w-4" />}>
            {mode === 'edit' ? 'Guardar cambios' : 'Guardar viaje'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
