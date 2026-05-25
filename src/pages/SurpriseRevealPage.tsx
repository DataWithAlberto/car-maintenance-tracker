import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Sparkles, Loader2, Images } from 'lucide-react';
import { tripsService } from '../services/trips.service';
import { TripActivityCard } from '../components/trips/TripActivityCard';
import type { PublicTripResponse, PublicTripPhoto } from '../types';

export const SurpriseRevealPage = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicTripResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!token) return;
    tripsService
      .getPublicByToken(token)
      .then(setData)
      .catch((e: Error) => setError(e.message ?? 'Enlace no válido'));
  }, [token]);

  if (error) return <CenterMessage title="Enlace no válido" body={error} />;
  if (!data)
    return (
      <CenterMessage icon={<Loader2 className="h-6 w-6 animate-spin" />} title="Cargando viaje…" />
    );
  if (data.locked) {
    return <LockedScreen revealDate={data.reveal_date} messagePreview={data.message_preview} />;
  }
  if (!opened) return <GiftBox onOpen={() => setOpened(true)} />;

  return (
    <main
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, var(--color-fog) 100%)',
        animation: 'reveal-fade .8s ease-out',
      }}
    >
      <style>{`
        @keyframes reveal-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header
        style={{
          padding: '64px 24px 40px',
          textAlign: 'center',
          background: 'radial-gradient(circle at 50% 0%, rgba(255,90,95,.12), transparent 60%)',
        }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 11, letterSpacing: '.22em', color: '#FF5A5F' }}
        >
          ✦ Sorpresa desvelada · {new Date().toLocaleDateString('es-ES')}
        </span>
        <h1
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 'clamp(48px, 8vw, 96px)',
            letterSpacing: '-2.4px',
            lineHeight: 1,
            margin: '16px 0 12px',
            background: 'linear-gradient(135deg, #1d1d1f 0%, #FF5A5F 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {data.trip.title ?? data.trip.end_location ?? 'Tu viaje'}
        </h1>
        <p
          className="text-graphite"
          style={{ fontSize: 18, fontWeight: 300, maxWidth: 560, margin: '0 auto' }}
        >
          {data.trip.notes ?? data.trip.end_location ?? ''}
        </p>
      </header>

      <section
        className="max-w-4xl mx-auto"
        style={{ padding: '20px 24px 40px', display: 'grid', gap: 16 }}
      >
        {data.activities.length === 0 ? (
          <p className="text-graphite text-center" style={{ fontSize: 14 }}>
            Sin actividades confirmadas en este viaje.
          </p>
        ) : (
          data.activities.map((a) => <TripActivityCard key={a.id} activity={a} editable={false} />)
        )}
      </section>

      <RevealAlbum photos={data.photos ?? []} />
    </main>
  );
};

/* ─── Álbum de Recuerdos (público, share_token) ──────────────────────────
 * Cubre los tres estados del viaje: planning (fotos del destino), confirmed
 * (preparativos / extras de Booking/Airbnb subidas por el regalador) y
 * completed (recuerdos del viaje). Lazy-loading nativo + reveal escalonado. */
const RevealAlbum = ({ photos }: { photos: PublicTripPhoto[] }) => {
  const items = useMemo(() => photos.filter((p) => p.public_url), [photos]);
  if (items.length === 0) return null;

  return (
    <section
      className="max-w-5xl mx-auto"
      style={{ padding: '0 24px 96px', display: 'grid', gap: 18 }}
    >
      <style>{`
        @keyframes album-up {
          from { opacity: 0; transform: translateY(12px) scale(.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .album-tile {
          animation: album-up .6s cubic-bezier(.16,.84,.36,1) both;
        }
      `}</style>

      <header
        className="flex items-center"
        style={{
          gap: 12,
          paddingTop: 32,
          borderTop: '1px solid var(--color-silver-mist, #e5e5ea)',
        }}
      >
        <Images className="w-5 h-5" color="#FF5A5F" strokeWidth={1.8} />
        <h2
          className="text-ink"
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          Álbum de Recuerdos
        </h2>
        <span className="font-mono text-graphite" style={{ fontSize: 11, letterSpacing: '.10em' }}>
          {items.length} {items.length === 1 ? 'foto' : 'fotos'}
        </span>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {items.map((p, i) => (
          <figure
            key={p.id}
            className="album-tile"
            style={{
              animationDelay: `${Math.min(i, 12) * 60}ms`,
              margin: 0,
              borderRadius: 16,
              overflow: 'hidden',
              background: 'var(--color-fog, #f5f5f7)',
              aspectRatio: '4 / 3',
              position: 'relative',
            }}
          >
            <img
              src={p.public_url}
              alt={p.caption ?? 'Recuerdo del viaje'}
              loading="lazy"
              decoding="async"
              width={p.width ?? undefined}
              height={p.height ?? undefined}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform .5s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
            />
            {p.caption && (
              <figcaption
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '24px 12px 10px',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.55) 100%)',
                }}
              >
                {p.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
};

/* ─── Caja de regalo CSS ─── */
const GiftBox = ({ onOpen }: { onOpen: () => void }) => (
  <main
    className="min-h-screen flex flex-col items-center justify-center"
    style={{
      background: 'radial-gradient(circle at 50% 40%, #FF5A5F22, #fff 70%)',
      padding: 24,
    }}
  >
    <style>{`
      @keyframes wobble { 0%,100% { transform: rotate(-2deg) } 50% { transform: rotate(2deg) } }
      .gift-box {
        animation: wobble 2.5s ease-in-out infinite;
        transform-origin: bottom center;
        transition: transform .2s ease;
      }
      .gift-box:hover { animation-play-state: paused; transform: scale(1.05); }
    `}</style>

    <span
      className="font-mono uppercase"
      style={{ fontSize: 11, letterSpacing: '.22em', color: '#FF5A5F' }}
    >
      ✦ Tienes un regalo
    </span>
    <h1
      style={{
        fontFamily: 'Inter, var(--font-sf-pro-display)',
        fontWeight: 700,
        fontSize: 'clamp(40px, 6vw, 72px)',
        letterSpacing: '-2px',
        margin: '12px 0 32px',
        textAlign: 'center',
      }}
    >
      Una sorpresa te espera.
    </h1>

    <button
      onClick={onOpen}
      type="button"
      className="gift-box"
      style={{
        background: 'linear-gradient(135deg, #FF5A5F 0%, #FF8588 100%)',
        border: 'none',
        borderRadius: 24,
        padding: '48px 56px',
        cursor: 'pointer',
        boxShadow: '0 24px 48px rgba(255,90,95,.35), 0 8px 16px rgba(255,90,95,.25)',
        position: 'relative',
      }}
    >
      <Gift className="h-20 w-20" color="#fff" strokeWidth={1.6} />
      <span
        style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#febb02',
          color: '#1d1d1f',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '.06em',
        }}
      >
        ABRIR
      </span>
    </button>

    <p className="text-graphite" style={{ marginTop: 32, fontSize: 14, textAlign: 'center' }}>
      Pulsa para desvelar tu viaje.
    </p>
  </main>
);

interface LockedScreenProps {
  revealDate: string;
  messagePreview: string;
}
const LockedScreen = ({ revealDate, messagePreview }: LockedScreenProps) => (
  <CenterMessage
    icon={<Sparkles className="h-8 w-8" color="#FF5A5F" />}
    title="Aún no es el momento"
    body={
      <>
        {messagePreview && (
          <p style={{ fontStyle: 'italic', marginBottom: 8 }}>"{messagePreview}…"</p>
        )}
        Se desvela el{' '}
        <b>
          {new Date(revealDate).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
        </b>
        .
      </>
    }
  />
);

interface CenterMessageProps {
  title: string;
  body?: React.ReactNode;
  icon?: React.ReactNode;
}
const CenterMessage = ({ title, body, icon }: CenterMessageProps) => (
  <main
    className="min-h-screen flex flex-col items-center justify-center"
    style={{ padding: 24, textAlign: 'center' }}
  >
    {icon}
    <h1 style={{ fontSize: 28, fontWeight: 700, margin: '16px 0 8px' }}>{title}</h1>
    {body && (
      <p className="text-graphite" style={{ fontSize: 15, maxWidth: 420 }}>
        {body}
      </p>
    )}
  </main>
);
