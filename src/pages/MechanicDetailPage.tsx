import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Phone, Globe, Navigation, Clock, Wrench, Star, Check, Calendar, ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FloatingTextarea } from '../components/ui/FloatingInput';
import { MechanicsMap } from '../components/mechanics/MechanicsMap';
import { useMechanicsStore } from '../store/mechanicsStore';
import { useMechanicRatingsStore } from '../store/mechanicRatingsStore';
import { formatDate } from '../utils/formatters';

// ─── Opening hours parser ─────────────────────────────────────────────────────
const DAY_MAP: Record<string, string> = {
  Mo: 'Lun', Tu: 'Mar', We: 'Mié', Th: 'Jue',
  Fr: 'Vie', Sa: 'Sáb', Su: 'Dom',
};

const parseOpeningHours = (raw: string): { label: string; hours: string }[] => {
  try {
    return raw.split(';').map((segment) => {
      const part = segment.trim();
      const match = part.match(/^([A-Za-z,-]+)\s+(.+)$/);
      if (!match) return { label: '', hours: part };
      const days = match[1]
        .replace(/([A-Z][a-z])-([A-Z][a-z])/g, (_, a, b) => `${DAY_MAP[a] ?? a}–${DAY_MAP[b] ?? b}`)
        .replace(/,([A-Z][a-z])/g, (_, d) => `, ${DAY_MAP[d] ?? d}`);
      return { label: days, hours: match[2] };
    });
  } catch {
    return [{ label: '', hours: raw }];
  }
};

// ─── Star rating ──────────────────────────────────────────────────────────────
const StarRating = ({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform active:scale-90"
          aria-label={`${n} estrellas`}
        >
          <Star
            className="h-7 w-7"
            strokeWidth={1.5}
            style={{
              fill: n <= (hovered || value) ? '#f5a623' : 'transparent',
              color: n <= (hovered || value) ? '#f5a623' : '#c7c7cc',
            }}
          />
        </button>
      ))}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export const MechanicDetailPage = () => {
  const navigate = useNavigate();
  const { mechanics, selectedId } = useMechanicsStore();
  const { ratings, setRating, addVisit } = useMechanicRatingsStore();

  const mechanic = mechanics.find((m) => m.id === selectedId) ?? null;
  const existing = mechanic ? ratings[mechanic.id] : undefined;

  const [starValue, setStarValue] = useState(existing?.rating ?? 0);
  const [note, setNote] = useState(existing?.note ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!mechanic) return;
    const r = ratings[mechanic.id];
    setStarValue(r?.rating ?? 0);
    setNote(r?.note ?? '');
    setSaved(false);
  }, [mechanic, ratings]);

  if (!mechanic) {
    return (
      <div className="px-6 sm:px-10 py-16">
        <EmptyState
          icon={Wrench}
          title="Taller no encontrado"
          description="Vuelve a la búsqueda de talleres y selecciona uno."
          action={
            <Button variant="accent" onClick={() => navigate('/mechanics')}>
              Ir a Talleres IA
            </Button>
          }
        />
      </div>
    );
  }

  const hours = mechanic.openingHours ? parseOpeningHours(mechanic.openingHours) : null;
  const visits = existing?.visits ?? [];

  const handleSave = () => {
    setRating(mechanic.id, { rating: starValue, note, visits });
    setSaved(true);
  };

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mechanic.lat},${mechanic.lng}`;
  const osmUrl  = `https://www.openstreetmap.org/node/${mechanic.id.replace(/\D+/g, '')}`;

  return (
    <div className="px-6 sm:px-10 py-10 space-y-8">
      {/* Back */}
      <button
        onClick={() => navigate('/mechanics')}
        className="inline-flex items-center gap-1.5 font-text text-graphite hover:text-ink transition-colors"
        style={{ fontSize: 14 }}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
        Volver a Talleres IA
      </button>

      {/* Header */}
      <header>
        <span className="eyebrow">
          {mechanic.brand ? `Especialista ${mechanic.brand}` : 'Taller mecánico'}
          {' · '}{mechanic.distanceKm.toFixed(1)} km
        </span>
        <h1
          className="text-ink"
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 'clamp(34px, 5vw, 48px)',
            lineHeight: 1.08,
            letterSpacing: '-0.8px',
            margin: '12px 0 0',
          }}
        >
          {mechanic.name}
        </h1>
      </header>

      {/* Map */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-3">
        <MechanicsMap
          origin={null}
          mechanics={[mechanic]}
          selectedId={mechanic.id}
          style={{ minHeight: 300, borderRadius: 20 }}
        />
      </section>

      {/* Info */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-5">
        <h2 className="font-mono uppercase text-graphite" style={{ fontSize: 11, letterSpacing: '0.14em' }}>
          Información
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {mechanic.address && (
            <InfoRow icon={MapPin} label="Dirección" value={mechanic.address} />
          )}
          {mechanic.phone && (
            <InfoRow icon={Phone} label="Teléfono" value={mechanic.phone} href={`tel:${mechanic.phone}`} />
          )}
          {mechanic.website && (
            <InfoRow icon={Globe} label="Web" value="Abrir sitio web" href={mechanic.website} />
          )}
          {mechanic.brand && (
            <InfoRow icon={Wrench} label="Especialidad" value={mechanic.brand} />
          )}
        </div>

        {hours && (
          <div className="bg-fog rounded-[18px] px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-graphite" strokeWidth={1.6} />
              <span className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                Horario
              </span>
            </div>
            <div className="space-y-1.5">
              {hours.map((row, i) => (
                <div key={i} className="flex items-baseline justify-between gap-4">
                  <span className="font-text text-graphite" style={{ fontSize: 13 }}>{row.label}</span>
                  <span className="font-text text-ink tabular-nums" style={{ fontSize: 13 }}>{row.hours}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap pt-1">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-text text-azure"
            style={{ fontSize: 13 }}
          >
            <Navigation className="h-3.5 w-3.5" strokeWidth={1.7} />
            Cómo llegar (Google Maps)
          </a>
          <a
            href={osmUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-text text-azure"
            style={{ fontSize: 13 }}
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.7} />
            Ver en OpenStreetMap
          </a>
        </div>
      </section>

      {/* Visits */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
              Visitas registradas
            </p>
            <p className="font-text text-ink mt-1" style={{ fontSize: 18, fontWeight: 600 }}>
              {visits.length === 0 ? 'Ninguna aún' : `${visits.length} visita${visits.length > 1 ? 's' : ''}`}
            </p>
            {visits.length > 0 && (
              <p className="font-text text-graphite" style={{ fontSize: 12.5 }}>
                Última: {formatDate(visits[visits.length - 1])}
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addVisit(mechanic.id)}
            iconLeft={<Calendar className="h-3.5 w-3.5" strokeWidth={1.7} />}
          >
            Marcar visita hoy
          </Button>
        </div>
      </section>

      {/* Personal rating */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-4">
        <h2 className="font-mono uppercase text-graphite" style={{ fontSize: 11, letterSpacing: '0.14em' }}>
          Tu valoración
        </h2>
        <StarRating value={starValue} onChange={(v) => { setStarValue(v); setSaved(false); }} />
        <FloatingTextarea
          label="Notas personales (opcional)"
          value={note}
          onChange={(e) => { setNote(e.target.value); setSaved(false); }}
          style={{ minHeight: 90 }}
        />
        <div>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSave}
            disabled={starValue === 0}
            iconLeft={
              saved
                ? <Check className="h-4 w-4" strokeWidth={2} />
                : <Star className="h-4 w-4" strokeWidth={1.8} />
            }
          >
            {saved ? 'Guardado' : 'Guardar valoración'}
          </Button>
        </div>
      </section>
    </div>
  );
};

// ─── Info row ─────────────────────────────────────────────────────────────────
const InfoRow = ({
  icon: Icon, label, value, href,
}: { icon: typeof MapPin; label: string; value: string; href?: string }) => (
  <div className="bg-fog rounded-[14px] px-4 py-3">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="h-3.5 w-3.5 text-graphite" strokeWidth={1.6} />
      <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
        {label}
      </p>
    </div>
    {href ? (
      <a
        href={href}
        target={href.startsWith('tel:') ? undefined : '_blank'}
        rel="noreferrer"
        className="font-text text-azure font-medium"
        style={{ fontSize: 14 }}
      >
        {value}
      </a>
    ) : (
      <p className="font-text text-ink" style={{ fontSize: 14 }}>{value}</p>
    )}
  </div>
);
