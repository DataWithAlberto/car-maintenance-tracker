import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Sparkles, Loader2, Images } from 'lucide-react';
import { tripsService } from '../services/trips.service';
import { TripActivityCard } from '../components/trips/TripActivityCard';
import type { PublicTripResponse, PublicTripPhoto, SurpriseAnimation } from '../types';

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

  const animation: SurpriseAnimation = data.trip.surprise_config?.animation ?? 'gift';

  if (!opened) {
    if (animation === 'scratch') return <ScratchCard onOpen={() => setOpened(true)} />;
    if (animation === 'envelope') return <EnvelopeBox onOpen={() => setOpened(true)} />;
    return <GiftBox onOpen={() => setOpened(true)} />;
  }

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

/* ─── Rasca y gana ──────────────────────────────────────────────────────────
 * Canvas overlay con destination-out. Auto-revela al 50% de superficie. */
const ScratchCard = ({ onOpen }: { onOpen: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const revealed = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#86868b');
    grad.addColorStop(1, '#6e6e73');
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 24);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0.14em';
    ctx.fillText('RASCA PARA DESCUBRIR', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '28px serif';
    ctx.fillText('✨', canvas.width / 2, canvas.height / 2 + 28);
  }, []);

  const checkReveal = () => {
    const canvas = canvasRef.current;
    if (!canvas || revealed.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < data.data.length; i += 4) {
      if (data.data[i] < 128) transparent++;
    }
    if (transparent / (data.data.length / 4) > 0.45) {
      revealed.current = true;
      canvas.style.transition = 'opacity .5s ease';
      canvas.style.opacity = '0';
      setTimeout(onOpen, 500);
    }
  };

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (x - rect.left) * scaleX;
    const cy = (y - rect.top) * scaleY;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();
    checkReveal();
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 50% 40%, #FF5A5F22, #fff 70%)',
        padding: 24,
      }}
    >
      <style>{`
        @keyframes float-up {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .scratch-hint { animation: float-up 3s ease-in-out infinite; }
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
          fontSize: 'clamp(36px, 5vw, 64px)',
          letterSpacing: '-1.5px',
          margin: '12px 0 32px',
          textAlign: 'center',
        }}
      >
        ¿Adónde vamos?
      </h1>

      <div
        style={{
          position: 'relative',
          width: 'min(380px, 88vw)',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 32px 64px rgba(0,0,0,.14), 0 8px 20px rgba(0,0,0,.08)',
        }}
      >
        {/* Destino oculto debajo del canvas */}
        <div
          style={{
            width: '100%',
            height: 220,
            background: 'linear-gradient(135deg, #FF5A5F 0%, #FF8588 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 44 }}>🗺️</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.5px',
            }}
          >
            ¡Sorpresa!
          </span>
        </div>

        {/* Canvas de rascado encima */}
        <canvas
          ref={canvasRef}
          width={760}
          height={440}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={() => (isDrawing.current = true)}
          onMouseUp={() => (isDrawing.current = false)}
          onMouseLeave={() => (isDrawing.current = false)}
          onMouseMove={(e) => {
            if (!isDrawing.current) return;
            scratchAt(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            isDrawing.current = true;
            scratchAt(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            scratchAt(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={() => (isDrawing.current = false)}
        />
      </div>

      <p className="scratch-hint text-graphite" style={{ marginTop: 32, fontSize: 14 }}>
        Arrastra el dedo (o el ratón) para desvelar el destino.
      </p>
    </main>
  );
};

/* ─── Sobre animado ─────────────────────────────────────────────────────────
 * CSS puro: solapa superior se abre, el destino emerge hacia arriba. */
const EnvelopeBox = ({ onOpen }: { onOpen: () => void }) => {
  const [phase, setPhase] = useState<'idle' | 'opening' | 'done'>('idle');

  const handleClick = () => {
    if (phase !== 'idle') return;
    setPhase('opening');
    setTimeout(() => {
      setPhase('done');
      setTimeout(onOpen, 600);
    }, 1000);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 50% 40%, rgba(255,90,95,.12), #fff 70%)',
        padding: 24,
      }}
    >
      <style>{`
        @keyframes env-wobble {
          0%, 100% { transform: rotate(-1.5deg) translateY(0); }
          50% { transform: rotate(1.5deg) translateY(-4px); }
        }
        @keyframes flap-open {
          from { transform: rotateX(0deg); }
          to   { transform: rotateX(-180deg); }
        }
        @keyframes letter-rise {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(-40px); opacity: 1; }
        }
        .env-idle { animation: env-wobble 2.8s ease-in-out infinite; }
        .env-opening { animation: none; }
        .flap-open { animation: flap-open .9s cubic-bezier(.32,.72,0,1) forwards; transform-origin: top center; }
        .letter-rise { animation: letter-rise .7s .6s cubic-bezier(.16,.84,.36,1) both; }
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
          fontSize: 'clamp(36px, 5vw, 64px)',
          letterSpacing: '-1.5px',
          margin: '12px 0 40px',
          textAlign: 'center',
        }}
      >
        Tienes una carta.
      </h1>

      {/* Sobre */}
      <button
        type="button"
        onClick={handleClick}
        disabled={phase !== 'idle'}
        className={phase === 'idle' ? 'env-idle' : 'env-opening'}
        style={{
          background: 'none',
          border: 'none',
          cursor: phase === 'idle' ? 'pointer' : 'default',
          position: 'relative',
          perspective: 800,
        }}
      >
        {/* Cuerpo del sobre */}
        <div
          style={{
            width: 280,
            height: 180,
            background: 'linear-gradient(160deg, #fff8f0 0%, #fff 100%)',
            borderRadius: 12,
            boxShadow: '0 24px 56px rgba(0,0,0,.15), 0 8px 18px rgba(0,0,0,.08)',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          {/* Triángulo inferior (solapa base) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 90,
              background: '#FFE4E5',
              clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
            }}
          />
          {/* Triángulo izquierdo */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 140,
              height: 180,
              background: '#FFF0F0',
              clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
            }}
          />
          {/* Triángulo derecho */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 140,
              height: 180,
              background: '#FFF0F0',
              clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
            }}
          />
          {/* Corazón en el centro */}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              zIndex: 2,
            }}
          >
            ❤️
          </span>

          {/* Letra emergiendo */}
          {phase === 'opening' && (
            <div
              className="letter-rise"
              style={{
                position: 'absolute',
                top: -30,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 220,
                background: '#fff',
                borderRadius: 8,
                padding: '12px 16px',
                boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                zIndex: 10,
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 22 }}>✈️</span>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#FF5A5F',
                  letterSpacing: '.06em',
                }}
              >
                ¡Sorpresa!
              </p>
            </div>
          )}

          {/* Solapa superior */}
          <div
            className={phase !== 'idle' ? 'flap-open' : ''}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 90,
              background: '#FFD6D8',
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
              zIndex: 5,
              transformOrigin: 'top center',
            }}
          />
        </div>

        {/* Sello decorativo */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 4,
            border: '2px solid #FF5A5F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            zIndex: 8,
          }}
        >
          ✦
        </div>
      </button>

      <p className="text-graphite" style={{ marginTop: 32, fontSize: 14 }}>
        {phase === 'idle' ? 'Pulsa el sobre para abrirlo.' : '…'}
      </p>
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
