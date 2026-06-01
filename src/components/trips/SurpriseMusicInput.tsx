import { useRef, useState } from 'react';
import { Music, Upload, Trash2, Play, Pause } from 'lucide-react';
import { storageService } from '../../services/storage.service';
import toast from 'react-hot-toast';

interface Props {
  tripId: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

/* Sube una canción de fondo para el reveal. Distinto del mensaje de voz:
 * suena en bucle suave al abrir la sorpresa. */
export const SurpriseMusicInput = ({ tripId, value, onChange }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Selecciona un archivo de audio (mp3, m4a…)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Canción demasiado grande (máx 10 MB)');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'mp3';
      const path = `surprise/${tripId}/music-${Date.now()}.${ext}`;
      const url = await storageService.upload(path, file);
      onChange(url);
      toast.success('Música de fondo lista');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la canción');
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };

  return (
    <div
      style={{
        background: 'var(--surface-card, #fff)',
        border: '1px dashed var(--color-silver-mist, #e5e5ea)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 10 }}>
        <span
          className="font-mono uppercase text-graphite flex items-center"
          style={{ fontSize: 10, letterSpacing: '.18em', gap: 6 }}
        >
          <Music className="h-3 w-3" /> Música de fondo · opcional
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar música"
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1a6',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {value ? (
        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: 'none',
              background: '#a64dff',
              color: '#fff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <audio
            ref={audioRef}
            src={value}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            controls
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
      ) : (
        <label
          className="transition-colors hover:bg-fog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            color: 'var(--color-ink, #1d1d1f)',
            border: '1px solid var(--color-silver-mist, #e5e5ea)',
            borderRadius: 999,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 500,
            cursor: uploading ? 'wait' : 'pointer',
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Subiendo…' : 'Subir canción'}
          <input type="file" accept="audio/*" onChange={handleFile} disabled={uploading} hidden />
        </label>
      )}
      <p className="text-graphite" style={{ fontSize: 10, marginTop: 8 }}>
        Sonará suave al abrir la sorpresa. La persona podrá silenciarla.
      </p>
    </div>
  );
};
