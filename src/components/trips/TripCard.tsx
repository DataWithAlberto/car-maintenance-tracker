import { MapPin, Calendar, Gauge, Fuel, Clock, Thermometer, Share2, Trash2, ChevronRight, Music2, Wind } from 'lucide-react';
import type { Trip } from '../../types';
import { formatDate, formatKm } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface TripCardProps {
  trip: Trip;
  selected?: boolean;
  onClick: () => void;
  onDelete: () => void;
  onShare: () => void;
}

const weatherIcon: Record<string, string> = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️',
  Haze: '🌫️', Windy: '💨',
};

const formatDrivingTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

export const TripCard = ({ trip, selected, onClick, onDelete, onShare }: TripCardProps) => {
  const hasCoords = trip.start_lat != null || trip.end_lat != null || (trip.waypoints?.length ?? 0) > 0;

  return (
    <li
      className={cn(
        'group bg-cloud-white border rounded-card p-4 transition-all cursor-pointer',
        selected
          ? 'border-sunset-orange/50 shadow-card ring-1 ring-sunset-orange/20'
          : 'border-sky-blueprint/20 hover:border-sky-blueprint/40 hover:shadow-subtle',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {trip.title && (
            <p className="font-simeiz text-subheading font-light text-ink-black leading-tight truncate mb-0.5">
              {trip.title}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-manrope text-caption text-sky-dark font-medium truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {trip.start_location}
            </span>
            <span className="text-ink-charcoal/40">→</span>
            <span className="inline-flex items-center gap-1 font-manrope text-caption text-sunset-orange font-medium truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {trip.end_location}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {trip.weather_condition && (
            <span className="text-base" title={trip.weather_condition}>
              {weatherIcon[trip.weather_condition] ?? '🌡️'}
            </span>
          )}
          {hasCoords && (
            <span className="h-1.5 w-1.5 rounded-full bg-sky-blueprint/60" title="Tiene coordenadas" />
          )}
          <ChevronRight className={cn(
            'h-4 w-4 transition-all',
            selected ? 'text-sunset-orange' : 'text-ink-charcoal/40 group-hover:text-sky-dark group-hover:translate-x-0.5',
          )} />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal/70">
          <Calendar className="h-3 w-3" />
          {formatDate(trip.start_datetime)}
        </span>
        {trip.total_km != null && (
          <span className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal/70 tabular-nums">
            <Gauge className="h-3 w-3" />
            {formatKm(trip.total_km)}
          </span>
        )}
        {trip.driving_time_minutes != null && (
          <span className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal/70">
            <Clock className="h-3 w-3" />
            {formatDrivingTime(trip.driving_time_minutes)}
          </span>
        )}
        {trip.fuel_consumed != null && (
          <span className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal/70 tabular-nums">
            <Fuel className="h-3 w-3" />
            {trip.fuel_consumed.toFixed(1)} L
          </span>
        )}
        {trip.avg_speed != null && (
          <span className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal/70 tabular-nums">
            <Wind className="h-3 w-3" />
            {trip.avg_speed} km/h
          </span>
        )}
        {trip.weather_temp != null && (
          <span className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal/70 tabular-nums">
            <Thermometer className="h-3 w-3" />
            {trip.weather_temp.toFixed(0)}°C
          </span>
        )}
        {trip.spotify_playlist_url && (
          <a
            href={trip.spotify_playlist_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-manrope text-caption text-success-500 hover:text-success-400 transition-colors"
          >
            <Music2 className="h-3 w-3" />
            Playlist
          </a>
        )}
      </div>

      {/* Notes snippet */}
      {trip.notes && (
        <p className="mt-2 font-manrope text-caption text-ink-charcoal/60 line-clamp-1 italic">
          "{trip.notes}"
        </p>
      )}

      {/* Waypoints count */}
      {(trip.waypoints?.length ?? 0) > 0 && (
        <p className="mt-1.5 font-manrope text-caption text-sky-dark/70">
          {trip.waypoints!.length} punto{trip.waypoints!.length !== 1 ? 's' : ''} de interés
        </p>
      )}

      {/* Actions */}
      <div className="mt-3 pt-2.5 border-t border-sky-blueprint/12 flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal hover:text-sky-dark px-2 py-1 rounded-input hover:bg-sky-blueprint/10 transition-colors"
          aria-label="Compartir"
        >
          <Share2 className="h-3.5 w-3.5" /> Compartir
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="inline-flex items-center gap-1 font-manrope text-caption text-ink-charcoal hover:text-danger-400 px-2 py-1 rounded-input hover:bg-danger-500/10 transition-colors"
          aria-label="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </button>
      </div>
    </li>
  );
};
