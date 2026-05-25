import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Sparkles, Loader2 } from 'lucide-react';
import { tripsService } from '../services/trips.service';
import { TripActivityCard } from '../components/trips/TripActivityCard';
import type { PublicTripResponse } from '../types';

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
        style={{ padding: '20px 24px 80px', display: 'grid', gap: 16 }}
      >
        {data.activities.length === 0 ? (
          <p className="text-graphite text-center" style={{ fontSize: 14 }}>
            Sin actividades confirmadas en este viaje.
          </p>
        ) : (
          data.activities.map((a) => <TripActivityCard key={a.id} activity={a} editable={false} />)
        )}
      </section>
    </main>
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
