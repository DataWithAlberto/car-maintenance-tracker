import type { CSSProperties } from 'react';
import {
  MapPin, Calendar, Gauge, Fuel, Clock, Thermometer,
  Share2, Trash2, ChevronRight, Music2, Wind,
} from 'lucide-react';
import type { Trip } from '../../types';
import { formatDate, formatKm } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface TripCardProps {
  trip: Trip;
  selected?: boolean;
  onClick: () => void;
  onDelete: () => void;
  onShare: () => void;
  className?: string;
  style?: CSSProperties;
}

const weatherIcon: Record<string, string> = {
  Clear: '☀', Clouds: '☁', Rain: '🌧', Drizzle: '🌦',
  Thunderstorm: '⛈', Snow: '❄', Mist: '🌫', Fog: '🌫',
  Haze: '🌫', Windy: '💨',
};

const formatDrivingTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

export const TripCard = ({ trip, selected, onClick, onDelete, onShare, className, style }: TripCardProps) => {
  const hasCoords =
    trip.start_lat != null || trip.end_lat != null || (trip.waypoints?.length ?? 0) > 0;

  return (
    <li
      className={cn(
        'group bg-snow rounded-[14px] p-4 transition-colors cursor-pointer',
        selected
          ? 'border-2 border-ink'
          : 'border border-silver-mist hover:bg-fog',
        className,
      )}
      style={style}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {trip.title && (
            <p
              className="font-display text-ink truncate"
              style={{
                fontWeight: 600, fontSize: 17, lineHeight: 1.2, letterSpacing: '-0.1px',
              }}
            >
              {trip.title}
            </p>
          )}
          <div className={cn('flex items-center gap-1.5', trip.title && 'mt-1')}>
            <span className="flex items-center gap-1 min-w-0 font-text text-ink" style={{ fontSize: 13 }}>
              <MapPin className="h-3 w-3 shrink-0 text-graphite" strokeWidth={1.6} />
              <span className="truncate">{trip.start_location}</span>
            </span>
            <span className="shrink-0 text-silver-mist">→</span>
            <span className="flex items-center gap-1 min-w-0 font-text text-ink" style={{ fontSize: 13 }}>
              <MapPin className="h-3 w-3 shrink-0 text-graphite" strokeWidth={1.6} />
              <span className="truncate">{trip.end_location}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trip.weather_condition && (
            <span title={trip.weather_condition} style={{ fontSize: 14 }}>
              {weatherIcon[trip.weather_condition] ?? ''}
            </span>
          )}
          {hasCoords && (
            <span
              className="rounded-full inline-block"
              style={{ width: 5, height: 5, background: '#a1a1a6' }}
              title="Tiene coordenadas"
            />
          )}
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              selected ? 'text-ink' : 'text-graphite group-hover:translate-x-0.5',
            )}
            strokeWidth={1.6}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-graphite font-text" style={{ fontSize: 13 }}>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" strokeWidth={1.6} />
          {formatDate(trip.start_datetime)}
        </span>
        {trip.total_km != null && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Gauge className="h-3 w-3" strokeWidth={1.6} />
            {formatKm(trip.total_km)}
          </span>
        )}
        {trip.driving_time_minutes != null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={1.6} />
            {formatDrivingTime(trip.driving_time_minutes)}
          </span>
        )}
        {trip.fuel_consumed != null && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Fuel className="h-3 w-3" strokeWidth={1.6} />
            {trip.fuel_consumed.toFixed(1)} L
          </span>
        )}
        {trip.avg_speed != null && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Wind className="h-3 w-3" strokeWidth={1.6} />
            {trip.avg_speed} km/h
          </span>
        )}
        {trip.weather_temp != null && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Thermometer className="h-3 w-3" strokeWidth={1.6} />
            {trip.weather_temp.toFixed(0)}°C
          </span>
        )}
        {trip.spotify_playlist_url && (
          <a
            href={trip.spotify_playlist_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-cobalt-link hover:opacity-70 transition-opacity"
          >
            <Music2 className="h-3 w-3" strokeWidth={1.6} />
            Playlist
          </a>
        )}
      </div>

      {/* Notes snippet */}
      {trip.notes && (
        <p
          className="mt-2 font-text text-graphite italic line-clamp-1"
          style={{ fontSize: 13 }}
        >
          "{trip.notes}"
        </p>
      )}

      {/* Waypoints count */}
      {(trip.waypoints?.length ?? 0) > 0 && (
        <p
          className="mt-1.5 font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '0.12em' }}
        >
          {trip.waypoints!.length} punto{trip.waypoints!.length !== 1 ? 's' : ''} de interés
        </p>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-silver-mist flex items-center gap-2 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            'font-text font-medium text-ink hover:bg-fog transition-colors',
          )}
          style={{ fontSize: 13 }}
          aria-label="Compartir"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.6} /> Compartir
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            'font-text font-medium text-graphite hover:text-caution hover:bg-fog transition-colors',
          )}
          style={{ fontSize: 13 }}
          aria-label="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} /> Eliminar
        </button>
      </div>
    </li>
  );
};
