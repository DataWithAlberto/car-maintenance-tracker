import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Sparkles, Loader2, Images, Play, Pause } from 'lucide-react';
import { tripsService } from '../services/trips.service';
import { TripActivityCard } from '../components/trips/TripActivityCard';
import { SurpriseConfetti } from '../components/trips/SurpriseConfetti';
import { SurpriseCountdown } from '../components/trips/SurpriseCountdown';
import { SurpriseReaction } from '../components/trips/SurpriseReaction';
import { SurpriseTypewriter } from '../components/trips/SurpriseTypewriter';
import { SurpriseFlyTo } from '../components/trips/SurpriseFlyTo';
import { SurpriseMusicPlayer } from '../components/trips/SurpriseMusicPlayer';
import { toSpotifyEmbedUrl } from '../utils/spotify';
import type { PublicTripResponse, PublicTripPhoto, SurpriseAnimation } from '../types';

/* ─── Keynote · tokens del sistema de diseño ─────────────────────────────────
 * Estética oscura, cinematográfica y enfocada en el contenido (estilo Apple):
 * negros profundos, gradientes metálicos y tipografía display de gran tamaño. */
const C = {
  bg: '#000000',
  surface1: '#111111',
  surface2: '#1a1a1c',
  surface3: '#222222',
  border: '#333333',
  borderHover: '#555555',
  fg: '#f5f5f7',
  muted: '#86868b',
  mutedDark: '#a1a1a6',
} as const;

const FONT_DISPLAY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/* Degradado metálico blanco → gris para titulares display */
const displayGradient: React.CSSProperties = {
  background: `linear-gradient(180deg, #fff 0%, ${C.muted} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/* Foco cinematográfico opaco. Usa colores sólidos (no rgba) para que el fondo
 * claro del body global —body{background:var(--color-fog)}— no se transparente. */
const spotlight = (y = 40) => `radial-gradient(circle at 50% ${y}%, #18181b 0%, ${C.bg} 70%)`;

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

  // Precarga portada y música mientras se ve la caja de regalo, para que el
  // reveal sea instantáneo y sin parpadeos.
  useEffect(() => {
    if (!data || data.locked || opened) return;
    const cfg = data.trip.surprise_config;
    if (cfg?.cover_url) {
      const img = new Image();
      img.src = cfg.cover_url;
    }
    if (cfg?.music_url) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = cfg.music_url;
    }
  }, [data, opened]);

  if (error) return <CenterMessage title="Enlace no válido" body={error} />;
  if (!data)
    return <CenterMessage icon={<Loader2 className="h-6 w-6 animate-spin" />} title="Cargando…" />;
  if (data.locked) {
    return (
      <LockedScreen
        revealDate={data.reveal_date}
        messagePreview={data.message_preview}
        hints={data.hints_revealed ?? []}
      />
    );
  }

  const animation: SurpriseAnimation = data.trip.surprise_config?.animation ?? 'gift';
  const coverUrl = data.trip.surprise_config?.cover_url ?? null;
  const audioUrl = data.trip.surprise_config?.audio_url ?? null;
  const reactions = data.trip.surprise_config?.reactions ?? {};
  const reason = data.trip.surprise_config?.reason ?? '';
  const funFacts = data.trip.surprise_config?.fun_facts ?? [];
  const musicUrl = data.trip.surprise_config?.music_url ?? null;
  const spotifyEmbed = data.trip.surprise_config?.spotify_url
    ? toSpotifyEmbedUrl(data.trip.surprise_config.spotify_url)
    : null;

  // Paradas del tour: usa las configuradas, o cae a origen → destino
  const configStops = data.trip.surprise_config?.route_stops ?? [];
  const routeStops =
    configStops.length > 0
      ? configStops
      : [data.trip.start_location, data.trip.end_location].filter(
          (s): s is string => !!s && s.trim().length > 0,
        );

  const handleOpen = () => {
    setOpened(true);
    if (token) {
      // Best-effort: si falla, no afecta la experiencia del destinatario
      tripsService.markSurpriseOpened(token).catch(() => undefined);
    }
  };

  if (!opened) {
    if (animation === 'scratch') return <ScratchCard onOpen={handleOpen} />;
    if (animation === 'envelope') return <EnvelopeBox onOpen={handleOpen} />;
    return <GiftBox onOpen={handleOpen} />;
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: C.bg,
        color: C.fg,
        animation: 'reveal-fade .8s ease-out',
      }}
    >
      <SurpriseConfetti trigger={opened} />
      {musicUrl && <SurpriseMusicPlayer url={musicUrl} />}
      <style>{`
        @keyframes reveal-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header
        style={{
          position: 'relative',
          padding: coverUrl ? '0' : '88px 24px 48px',
          textAlign: 'center',
          background: coverUrl
            ? 'transparent'
            : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,.07), transparent 60%)',
          overflow: 'hidden',
        }}
      >
        {coverUrl && (
          <div
            style={{
              position: 'relative',
              height: 'min(64vh, 520px)',
              background: `url(${coverUrl}) center/cover no-repeat`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.65) 65%, #000 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '24px 24px 48px',
                color: C.fg,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: '.22em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,245,247,.8)',
                  textShadow: '0 1px 8px rgba(0,0,0,.6)',
                }}
              >
                ✦ Sorpresa desvelada · {new Date().toLocaleDateString('es-ES')}
              </span>
              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 'clamp(48px, 9vw, 96px)',
                  letterSpacing: '-0.05em',
                  lineHeight: 1.05,
                  margin: '16px 0 12px',
                  color: C.fg,
                  textShadow: '0 4px 32px rgba(0,0,0,.6)',
                }}
              >
                {data.trip.title ?? data.trip.end_location ?? 'Tu viaje'}
              </h1>
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 400,
                  maxWidth: 600,
                  margin: '0 auto',
                  color: C.mutedDark,
                  textShadow: '0 2px 16px rgba(0,0,0,.4)',
                }}
              >
                {data.trip.notes ?? data.trip.end_location ?? ''}
              </p>
            </div>
          </div>
        )}
        {!coverUrl && (
          <>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                color: C.muted,
              }}
            >
              ✦ Sorpresa desvelada · {new Date().toLocaleDateString('es-ES')}
            </span>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 'clamp(48px, 9vw, 96px)',
                letterSpacing: '-0.05em',
                lineHeight: 1.05,
                margin: '16px 0 12px',
                ...displayGradient,
              }}
            >
              {data.trip.title ?? data.trip.end_location ?? 'Tu viaje'}
            </h1>
            <p
              style={{
                fontSize: 20,
                fontWeight: 400,
                maxWidth: 600,
                margin: '0 auto',
                color: C.mutedDark,
              }}
            >
              {data.trip.notes ?? data.trip.end_location ?? ''}
            </p>
          </>
        )}
      </header>

      {reason && <SurpriseTypewriter text={reason} />}

      {audioUrl && <AudioMessage url={audioUrl} />}

      {spotifyEmbed && (
        <section className="max-w-2xl mx-auto" style={{ padding: '0 24px', marginBottom: 24 }}>
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: `1px solid ${C.border}`,
              boxShadow: '0 8px 24px rgba(0,0,0,.5)',
            }}
          >
            <iframe
              title="Spotify"
              src={spotifyEmbed}
              width="100%"
              height={152}
              frameBorder={0}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </section>
      )}

      <SurpriseFlyTo stops={routeStops} />

      <section
        className="max-w-4xl mx-auto"
        style={{ padding: '20px 24px 40px', display: 'grid', gap: 16 }}
      >
        {data.activities.length === 0 ? (
          <p style={{ color: C.muted, textAlign: 'center', fontSize: 14 }}>
            Sin actividades confirmadas en este viaje.
          </p>
        ) : (
          data.activities.map((a) => (
            <TripActivityCard key={a.id} activity={a} editable={false} hidePrice />
          ))
        )}
      </section>

      {funFacts.length > 0 && <FunFactsSection facts={funFacts} />}

      <RevealAlbum photos={data.photos ?? []} />

      {token && <SurpriseReaction token={token} initialCounts={reactions} />}
    </main>
  );
};

/* ─── Sección de curiosidades generadas por IA ─────────────────────────── */
const FunFactsSection = ({ facts }: { facts: string[] }) => (
  <section className="max-w-4xl mx-auto" style={{ padding: '20px 24px 40px' }}>
    <header className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
      <Sparkles className="h-5 w-5" color={C.fg} />
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: 'clamp(22px, 3vw, 28px)',
          letterSpacing: '-0.02em',
          color: C.fg,
          margin: 0,
        }}
      >
        Curiosidades del destino
      </h2>
    </header>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12,
      }}
    >
      {facts.map((f, i) => (
        <article
          key={i}
          style={{
            background: C.surface1,
            border: `1px solid ${C.surface3}`,
            borderRadius: 12,
            padding: '18px 20px',
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: C.fg,
              fontWeight: 700,
              letterSpacing: '.1em',
            }}
          >
            ✦ {String(i + 1).padStart(2, '0')}
          </span>
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: C.fg }}>{f}</p>
        </article>
      ))}
    </div>
  </section>
);

/* ─── Reproductor del mensaje de voz · Módulo de audio Keynote ───────────── */
const AudioMessage = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };

  return (
    <section
      className="max-w-2xl mx-auto"
      style={{ padding: '0 24px', marginTop: -8, marginBottom: 24 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: C.surface1,
          border: `1px solid ${C.border}`,
          borderRadius: 999,
          padding: '10px 16px 10px 10px',
          boxShadow: '0 8px 24px rgba(0,0,0,.4)',
        }}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: 'none',
            background: C.fg,
            color: C.bg,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform .2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: C.muted,
              margin: 0,
            }}
          >
            Mensaje de voz
          </p>
          <audio
            ref={audioRef}
            src={url}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            controls
            style={{ width: '100%', marginTop: 4, colorScheme: 'dark' }}
          />
        </div>
      </div>
    </section>
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

    // Capa metálica cepillada: borde superior claro → base oscura
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#3a3a3c');
    grad.addColorStop(1, '#1a1a1c');
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 24);
    ctx.fill();

    ctx.fillStyle = 'rgba(245,245,247,0.35)';
    ctx.font = 'bold 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0.2em';
    ctx.fillText('RASCA PARA DESCUBRIR', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '28px serif';
    ctx.fillText('✦', canvas.width / 2, canvas.height / 2 + 30);
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
        background: spotlight(40),
        color: C.fg,
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
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: C.muted,
        }}
      >
        ✦ Tienes un regalo
      </span>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 'clamp(40px, 6vw, 72px)',
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          margin: '16px 0 32px',
          textAlign: 'center',
          ...displayGradient,
        }}
      >
        ¿Adónde vamos?
      </h1>

      <div
        style={{
          position: 'relative',
          width: 'min(380px, 88vw)',
          borderRadius: 24,
          overflow: 'hidden',
          border: `1px solid ${C.border}`,
          boxShadow: '0 32px 64px rgba(0,0,0,.7), 0 8px 20px rgba(0,0,0,.5)',
        }}
      >
        {/* Destino oculto debajo del canvas */}
        <div
          style={{
            width: '100%',
            height: 220,
            background: `linear-gradient(135deg, ${C.surface2} 0%, ${C.bg} 100%)`,
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
              letterSpacing: '-0.02em',
              ...displayGradient,
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

      <p className="scratch-hint" style={{ marginTop: 32, fontSize: 14, color: C.muted }}>
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
        background: spotlight(40),
        color: C.fg,
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
        @media (max-width: 360px) {
          .env-scale { transform: scale(.82); }
        }
      `}</style>

      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: C.muted,
        }}
      >
        ✦ Tienes un regalo
      </span>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 'clamp(40px, 6vw, 72px)',
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          margin: '16px 0 40px',
          textAlign: 'center',
          ...displayGradient,
        }}
      >
        Tienes una carta.
      </h1>

      {/* Sobre */}
      <button
        type="button"
        onClick={handleClick}
        disabled={phase !== 'idle'}
        className={`env-scale ${phase === 'idle' ? 'env-idle' : 'env-opening'}`}
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
            background: `linear-gradient(160deg, ${C.surface2} 0%, ${C.bg} 100%)`,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: '0 24px 56px rgba(0,0,0,.7), 0 8px 18px rgba(0,0,0,.5)',
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
              background: C.surface3,
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
              background: C.surface1,
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
              background: C.surface1,
              clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
            }}
          />
          {/* Sello central */}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: C.muted,
              zIndex: 2,
            }}
          >
            ✦
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
                background: C.surface1,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '14px 16px',
                boxShadow: '0 8px 24px rgba(0,0,0,.6)',
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
                  color: C.fg,
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
              background: C.surface2,
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
            border: `1.5px solid ${C.borderHover}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: C.fg,
            zIndex: 8,
          }}
        >
          ✦
        </div>
      </button>

      <p style={{ marginTop: 32, fontSize: 14, color: C.muted }}>
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
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <Images className="w-5 h-5" color={C.fg} strokeWidth={1.8} />
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '-0.02em',
            color: C.fg,
            margin: 0,
          }}
        >
          Álbum de Recuerdos
        </h2>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: '.10em',
            textTransform: 'uppercase',
            color: C.muted,
          }}
        >
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
              borderRadius: 12,
              overflow: 'hidden',
              background: C.surface1,
              border: `1px solid ${C.surface3}`,
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
                opacity: 0.85,
                transition: 'transform .5s ease, opacity .3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.opacity = '0.85';
              }}
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
                  background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.8) 100%)',
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

/* ─── Monolito de Regalo · superficie Keynote ─── */
const GiftBox = ({ onOpen }: { onOpen: () => void }) => (
  <main
    className="min-h-screen flex flex-col items-center justify-center"
    style={{
      background: spotlight(40),
      color: C.fg,
      padding: 24,
    }}
  >
    <style>{`
      @keyframes wobble { 0%,100% { transform: rotate(-2deg) } 50% { transform: rotate(2deg) } }
      .gift-box {
        animation: wobble 2.5s ease-in-out infinite;
        transform-origin: bottom center;
        transition: transform .4s cubic-bezier(0.16, 1, 0.3, 1), border-color .4s ease;
      }
      .gift-box:hover {
        animation-play-state: paused;
        transform: scale(1.03);
        border-color: ${C.borderHover} !important;
      }
    `}</style>

    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: '.22em',
        textTransform: 'uppercase',
        color: C.muted,
      }}
    >
      ✦ Tienes un regalo
    </span>
    <h1
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 'clamp(48px, 8vw, 96px)',
        letterSpacing: '-0.05em',
        lineHeight: 1.05,
        margin: '16px 0 40px',
        textAlign: 'center',
        ...displayGradient,
      }}
    >
      Una sorpresa te espera.
    </h1>

    <button
      onClick={onOpen}
      type="button"
      className="gift-box"
      style={{
        width: 200,
        height: 280,
        background: `linear-gradient(135deg, ${C.surface2} 0%, ${C.bg} 100%)`,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        cursor: 'pointer',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.05), 0 24px 48px rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Gift className="h-12 w-12" color={C.borderHover} strokeWidth={1.5} />
      <span
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: FONT_MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: C.muted,
        }}
      >
        Abrir
      </span>
    </button>

    <p style={{ marginTop: 32, fontSize: 14, textAlign: 'center', color: C.muted }}>
      Pulsa para desvelar tu viaje.
    </p>
  </main>
);

interface LockedScreenProps {
  revealDate: string;
  messagePreview: string;
  hints?: string[];
}
// Sin imagen de portada: la pantalla de espera NO debe delatar el destino.
const LockedScreen = ({ revealDate, messagePreview, hints = [] }: LockedScreenProps) => (
  <main
    className="min-h-screen flex flex-col items-center justify-center relative"
    style={{
      padding: 32,
      textAlign: 'center',
      color: C.fg,
      background: spotlight(30),
    }}
  >
    <Sparkles className="h-10 w-10" color={C.fg} />
    <h1
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 'clamp(40px, 6vw, 72px)',
        letterSpacing: '-0.04em',
        lineHeight: 1.05,
        margin: '20px 0 12px',
        ...displayGradient,
      }}
    >
      Aún no es el momento.
    </h1>
    {messagePreview && (
      <p
        style={{
          fontStyle: 'italic',
          fontSize: 16,
          maxWidth: 480,
          marginBottom: 12,
          color: C.mutedDark,
        }}
      >
        "{messagePreview}…"
      </p>
    )}
    <p style={{ fontSize: 13, maxWidth: 360, color: C.muted }}>
      Se desvela el{' '}
      <b style={{ color: C.fg }}>
        {new Date(revealDate).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
      </b>
      .
    </p>
    <SurpriseCountdown revealDate={revealDate} />

    {hints.length > 0 && (
      <section
        style={{
          marginTop: 32,
          maxWidth: 480,
          width: '100%',
          textAlign: 'left',
        }}
      >
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: C.muted,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          ✦ {hints.length === 1 ? 'Tu primera pista' : `${hints.length} pistas reveladas`}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {hints.map((h, i) => (
            <li
              key={i}
              style={{
                background: C.surface1,
                border: `1px solid ${C.surface3}`,
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 8,
                fontSize: 14,
                color: C.fg,
                lineHeight: 1.4,
                animation: `hint-in .6s ease-out ${i * 0.1}s both`,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  color: C.fg,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '.08em',
                  minWidth: 32,
                  paddingTop: 2,
                }}
              >
                D{i + 1}
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
        <style>{`
          @keyframes hint-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </section>
    )}
  </main>
);

interface CenterMessageProps {
  title: string;
  body?: React.ReactNode;
  icon?: React.ReactNode;
}
const CenterMessage = ({ title, body, icon }: CenterMessageProps) => (
  <main
    className="min-h-screen flex flex-col items-center justify-center"
    style={{ padding: 24, textAlign: 'center', background: C.bg, color: C.fg }}
  >
    {icon}
    <h1
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        margin: '16px 0 8px',
        color: C.fg,
      }}
    >
      {title}
    </h1>
    {body && <p style={{ fontSize: 15, maxWidth: 420, color: C.muted }}>{body}</p>}
  </main>
);
