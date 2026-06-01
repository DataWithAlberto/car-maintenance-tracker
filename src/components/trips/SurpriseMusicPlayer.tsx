import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/* Reproductor flotante de música de fondo del reveal.
 * Intenta autoplay al montar; los navegadores suelen bloquear el autoplay con
 * sonido, así que arranca silenciado o muestra un CTA para activar. */
export const SurpriseMusicPlayer = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    audio.loop = true;
    // Como el reveal se abre tras un clic del usuario (abrir el regalo),
    // el autoplay con sonido suele permitirse. Si falla, pedimos un toque.
    audio.play().catch(() => setNeedsTap(true));
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (needsTap) {
      audio
        .play()
        .then(() => setNeedsTap(false))
        .catch(() => undefined);
      return;
    }
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <>
      <audio ref={audioRef} src={url} preload="auto" />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Activar música' : 'Silenciar música'}
        className="transition-transform hover:scale-105"
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          right: 20,
          zIndex: 9998,
          width: 48,
          height: 48,
          borderRadius: 999,
          border: 'none',
          background: needsTap ? '#a64dff' : 'rgba(29,29,31,.85)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          backdropFilter: 'blur(8px)',
          animation: needsTap ? 'music-pulse 1.6s ease-in-out infinite' : 'none',
        }}
      >
        {muted || needsTap ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
      <style>{`
        @keyframes music-pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(166,77,255,.4); }
          50% { box-shadow: 0 8px 32px rgba(166,77,255,.8); }
        }
      `}</style>
    </>
  );
};
