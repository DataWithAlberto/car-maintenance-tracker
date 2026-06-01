import { useState } from 'react';
import { Trash2, Check, AlertCircle } from 'lucide-react';
import { toSpotifyEmbedUrl } from '../../utils/spotify';

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

/* Pega un enlace de Spotify (canción o playlist) y muestra el reproductor
 * oficial embebido. No requiere login del creador. */
export const SurpriseSpotifyInput = ({ value, onChange }: Props) => {
  const [draft, setDraft] = useState(value ?? '');
  const embed = toSpotifyEmbedUrl(draft);
  const savedEmbed = value ? toSpotifyEmbedUrl(value) : null;
  const dirty = draft.trim() !== (value ?? '').trim();

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
          <span style={{ color: '#1DB954', fontSize: 13 }}>♫</span> Spotify · opcional
        </span>
        {value && (
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onChange(null);
            }}
            aria-label="Quitar Spotify"
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

      <div className="flex items-center" style={{ gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pega el enlace de Spotify (canción o playlist)"
          style={{
            flex: 1,
            background: 'var(--surface-card)',
            border: '1px solid var(--color-silver-mist)',
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: 13,
            color: 'var(--color-ink)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          disabled={!embed || !dirty}
          onClick={() => onChange(draft.trim())}
          className="transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{
            background: '#1DB954',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Check className="h-3.5 w-3.5" /> Usar
        </button>
      </div>

      {draft.trim() && !embed && (
        <p
          className="flex items-center text-graphite"
          style={{ fontSize: 11, gap: 6, marginTop: 8, color: '#a64400', fontStyle: 'italic' }}
        >
          <AlertCircle className="h-3 w-3" />
          No parece un enlace de Spotify válido (track/playlist/album).
        </p>
      )}

      {/* Preview del widget guardado */}
      {savedEmbed && (
        <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden' }}>
          <iframe
            title="Spotify preview"
            src={savedEmbed}
            width="100%"
            height={152}
            frameBorder={0}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            style={{ border: 'none', display: 'block' }}
          />
        </div>
      )}

      <p className="text-graphite" style={{ fontSize: 10, marginTop: 8 }}>
        Cómo: en Spotify → Compartir → Copiar enlace. Aparecerá un reproductor en la sorpresa.
      </p>
    </div>
  );
};
