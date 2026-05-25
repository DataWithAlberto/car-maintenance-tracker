import { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import type { SurpriseConfig, SurpriseAnimation } from '../../types';

interface Props {
  enabled: boolean;
  config?: SurpriseConfig | null;
  onChange: (enabled: boolean, config: SurpriseConfig | null) => Promise<void>;
}

const ANIMATIONS: { value: SurpriseAnimation; label: string; emoji: string }[] = [
  { value: 'gift', label: 'Caja de regalo', emoji: '🎁' },
  { value: 'scratch', label: 'Rasca y gana', emoji: '✨' },
  { value: 'envelope', label: 'Sobre', emoji: '✉️' },
];

export const TripSurpriseEditor = ({ enabled, config, onChange }: Props) => {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SurpriseConfig>({
    message: config?.message ?? '',
    reveal_date: config?.reveal_date ?? '',
    animation: config?.animation ?? 'gift',
  });

  const toggle = async () => {
    setSaving(true);
    try {
      await onChange(!enabled, !enabled ? draft : null);
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await onChange(true, draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="bg-snow"
      style={{
        border: '1px solid var(--color-silver-mist)',
        borderLeft: `3px solid ${enabled ? '#FF5A5F' : 'var(--color-silver-mist)'}`,
        borderRadius: 18,
        padding: '18px 22px',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span
            className="font-mono uppercase text-graphite"
            style={{ fontSize: 11, letterSpacing: '.16em' }}
          >
            § Viaje sorpresa
          </span>
          <p className="text-graphite" style={{ fontSize: 12, marginTop: 4 }}>
            Oculta el viaje del dashboard y desvélalo con animación en el enlace público.
          </p>
        </div>
        <button
          onClick={toggle}
          type="button"
          disabled={saving}
          className="transition-opacity hover:opacity-85"
          style={{
            background: enabled ? '#FF5A5F' : '#fff',
            color: enabled ? '#fff' : '#1d1d1f',
            border: enabled ? 'none' : '1px solid var(--color-silver-mist)',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Gift className="h-4 w-4" />
          {enabled ? 'Activo' : 'Activar'}
        </button>
      </div>

      {enabled && (
        <div className="space-y-3" style={{ marginTop: 14 }}>
          <input
            value={draft.message ?? ''}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            placeholder="Mensaje al destinatario (ej. 'Feliz aniversario')"
            style={{
              width: '100%',
              background: '#fff',
              border: '1px solid var(--color-silver-mist)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={draft.reveal_date ?? ''}
              onChange={(e) => setDraft({ ...draft, reveal_date: e.target.value || undefined })}
              style={{
                width: '100%',
                background: '#fff',
                border: '1px solid var(--color-silver-mist)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <select
              value={draft.animation ?? 'gift'}
              onChange={(e) =>
                setDraft({ ...draft, animation: e.target.value as SurpriseAnimation })
              }
              style={{
                width: '100%',
                background: '#fff',
                border: '1px solid var(--color-silver-mist)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 14,
                outline: 'none',
              }}
            >
              {ANIMATIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.emoji} {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveDraft}
              type="button"
              disabled={saving}
              className="transition-opacity hover:opacity-85"
              style={{
                background: '#1d1d1f',
                color: '#fff',
                borderRadius: 999,
                border: 'none',
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {saving ? 'Guardando…' : 'Guardar sorpresa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
