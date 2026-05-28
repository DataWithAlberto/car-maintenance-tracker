import { useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { storageService } from '../../services/storage.service';
import toast from 'react-hot-toast';

interface Props {
  tripId: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

/* Imagen hero del reveal sorpresa. Se sube a Storage y la URL pública va
 * en surprise_config.cover_url para que el SurpriseRevealPage la pinte. */
export const SurpriseCoverInput = ({ tripId, value, onChange }: Props) => {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagen demasiado grande (máx 8 MB)');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `surprise/${tripId}/cover-${Date.now()}.${ext}`;
      const url = await storageService.upload(path, file);
      onChange(url);
      toast.success('Imagen de portada lista');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
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
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '.18em' }}
        >
          Imagen de portada · opcional
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Eliminar imagen"
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
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 10,
            overflow: 'hidden',
            background: 'var(--color-fog, #f5f5f7)',
          }}
        >
          <img
            src={value}
            alt="Portada del viaje sorpresa"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ) : (
        <label
          className="transition-colors hover:bg-fog"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '24px 16px',
            background: 'var(--color-fog, #f5f5f7)',
            border: '1px dashed var(--color-silver-mist, #e5e5ea)',
            borderRadius: 10,
            cursor: uploading ? 'wait' : 'pointer',
            color: '#707070',
            fontSize: 13,
          }}
        >
          {uploading ? (
            <>
              <Upload className="h-5 w-5 animate-pulse" />
              <span>Subiendo…</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
              <span>Sube una foto del destino</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} hidden />
        </label>
      )}
    </div>
  );
};
