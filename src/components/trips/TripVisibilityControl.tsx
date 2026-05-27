import { useState } from 'react';
import { Lock, Link as LinkIcon, Users, Copy, Check } from 'lucide-react';
import type { TripVisibility } from '../../types';

interface Props {
  visibility: TripVisibility;
  shareToken?: string;
  onChange: (next: TripVisibility) => Promise<void>;
}

const OPTIONS: { value: TripVisibility; label: string; icon: typeof Lock; help: string }[] = [
  { value: 'private', label: 'Privado', icon: Lock, help: 'Solo tú lo ves.' },
  {
    value: 'public_link',
    label: 'Link público',
    icon: LinkIcon,
    help: 'Cualquiera con el enlace puede ver el itinerario.',
  },
  {
    value: 'collaborative',
    label: 'Colaborativo',
    icon: Users,
    help: 'Invitados pueden editar las actividades.',
  },
];

export const TripVisibilityControl = ({ visibility, shareToken, onChange }: Props) => {
  const [copied, setCopied] = useState(false);
  const publicUrl = shareToken ? `${window.location.origin}/viajes/surprise/${shareToken}` : '';

  const copy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="bg-snow"
      style={{
        border: '1px solid var(--color-silver-mist)',
        borderRadius: 18,
        padding: '18px 22px',
      }}
    >
      <span
        className="font-mono uppercase text-graphite"
        style={{ fontSize: 11, letterSpacing: '.16em' }}
      >
        § Privacidad
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" style={{ marginTop: 12 }}>
        {OPTIONS.map((o) => {
          const active = visibility === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className="text-left transition-all"
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: `1.5px solid ${active ? 'var(--color-ink)' : 'var(--color-silver-mist)'}`,
                background: active ? 'var(--surface-canvas)' : 'var(--surface-card)',
                cursor: 'pointer',
              }}
            >
              <Icon
                className="h-4 w-4"
                style={{ color: active ? 'var(--color-ink)' : 'var(--color-graphite)' }}
              />
              <p className="text-ink" style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
                {o.label}
              </p>
              <p className="text-graphite" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>
                {o.help}
              </p>
            </button>
          );
        })}
      </div>

      {visibility !== 'private' && publicUrl && (
        <div
          className="flex items-center gap-2"
          style={{
            marginTop: 14,
            padding: '8px 12px',
            background: 'var(--color-fog)',
            borderRadius: 12,
            border: '1px solid var(--color-silver-mist)',
          }}
        >
          <LinkIcon className="h-4 w-4 text-graphite" />
          <code
            style={{
              flex: 1,
              fontSize: 12,
              color: 'var(--color-ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {publicUrl}
          </code>
          <button
            onClick={copy}
            type="button"
            className="transition-opacity hover:opacity-85"
            style={{
              background: copied ? 'var(--color-success-500, #1cb05c)' : 'var(--color-ink)',
              color: 'var(--color-snow)',
              borderRadius: 999,
              border: 'none',
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  );
};
