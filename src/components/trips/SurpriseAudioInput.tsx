import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload, Trash2, Play, Pause } from 'lucide-react';
import { storageService } from '../../services/storage.service';
import toast from 'react-hot-toast';

interface Props {
  tripId: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

const MAX_DURATION_S = 60;

/* Upload + grabación de mensaje de voz para el reveal sorpresa.
 * Usa MediaRecorder donde esté disponible y cae a <input file> si no. */
export const SurpriseAudioInput = ({ tripId, value, onChange }: Props) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const uploadBlob = async (blob: Blob, ext: string) => {
    setUploading(true);
    try {
      const file = new File([blob], `audio.${ext}`, { type: blob.type });
      const path = `surprise/${tripId}/audio-${Date.now()}.${ext}`;
      const url = await storageService.upload(path, file);
      onChange(url);
      toast.success('Mensaje de voz guardado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo subir el audio');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Tu navegador no soporta grabación. Sube un archivo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const ext = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm';
        await uploadBlob(blob, ext);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_DURATION_S) {
            stopRecording();
            return MAX_DURATION_S;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Audio demasiado grande (máx 5 MB)');
      return;
    }
    const ext = file.name.split('.').pop() ?? 'mp3';
    await uploadBlob(file, ext);
  };

  const remove = () => {
    onChange(null);
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
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
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '.18em' }}
        >
          Mensaje de voz · opcional
        </span>
        {value && (
          <button
            type="button"
            onClick={remove}
            aria-label="Eliminar audio"
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
              background: '#FF5A5F',
              color: '#fff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <audio
            ref={audioRef}
            src={value}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            preload="metadata"
            style={{ flex: 1 }}
            controls
          />
        </div>
      ) : (
        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={uploading}
              className="transition-opacity hover:opacity-85"
              style={{
                background: '#FF5A5F',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Mic className="h-3.5 w-3.5" /> Grabar
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="transition-opacity hover:opacity-85"
              style={{
                background: '#1d1d1f',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" /> Parar · {seconds}s
            </button>
          )}

          <label
            className="transition-colors hover:bg-fog"
            style={{
              background: 'transparent',
              color: 'var(--color-ink, #1d1d1f)',
              border: '1px solid var(--color-silver-mist, #e5e5ea)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Upload className="h-3.5 w-3.5" /> Subir archivo
            <input type="file" accept="audio/*" onChange={handleFile} disabled={uploading} hidden />
          </label>

          {uploading && (
            <span className="text-graphite" style={{ fontSize: 12 }}>
              Subiendo…
            </span>
          )}
        </div>
      )}
    </div>
  );
};
