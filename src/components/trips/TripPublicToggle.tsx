import { useState, useTransition } from 'react';
import { Lock, Globe2, Link as LinkIcon, Copy, Check } from 'lucide-react';

interface Props {
  isPublic: boolean;
  shareToken?: string;
  onChange: (next: boolean) => Promise<void>;
}

/* Control de visibilidad binario:
 *   OFF → "Solo para mí" (candado).
 *   ON  → "Visible para todos" (globo) + panel con enlace + botón copiar.
 *
 * El click es optimista: cambiamos el estado local de inmediato y reservamos
 * el await para el callback. Si falla, el padre vuelve a setear isPublic. */
export const TripPublicToggle = ({ isPublic, shareToken, onChange }: Props) => {
  const [optimistic, setOptimistic] = useState(isPublic);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  /* Sincroniza si el padre actualiza desde fuera (por ejemplo, tras revertir
   * un error). useState con prop inicial no se reactualiza solo. */
  if (optimistic !== isPublic && !pending) {
    setOptimistic(isPublic);
  }

  const publicUrl =
    shareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/viajes/share/${shareToken}`
      : '';

  const handleToggle = () => {
    if (pending) return;
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      try {
        await onChange(next);
      } catch {
        setOptimistic(!next);
      }
    });
  };

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

      <div className="flex items-center justify-between mt-3" style={{ gap: 14, flexWrap: 'wrap' }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <div
            aria-hidden
            className="transition-colors duration-300"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: optimistic ? 'rgba(0,102,204,.12)' : 'var(--color-fog, #f5f5f7)',
              color: optimistic ? '#0066cc' : '#1d1d1f',
            }}
          >
            {optimistic ? (
              <Globe2 className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <Lock className="h-5 w-5" strokeWidth={1.8} />
            )}
          </div>
          <div>
            <p
              className="text-ink"
              style={{
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {optimistic ? 'Compartido' : 'Solo para mí'}
            </p>
            <p
              className="text-graphite"
              style={{ fontSize: 12, margin: '2px 0 0', lineHeight: 1.4 }}
            >
              {optimistic
                ? 'Visible para quienes tienen acceso al vehículo.'
                : 'Solo tú puedes ver este viaje.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={optimistic}
          aria-label="Hacer viaje público"
          onClick={handleToggle}
          disabled={pending}
          className="relative inline-flex items-center transition-colors duration-300 ease-out focus-ring"
          style={{
            width: 56,
            height: 32,
            borderRadius: 999,
            border: 'none',
            cursor: pending ? 'wait' : 'pointer',
            background: optimistic ? '#0066cc' : '#c7c7cc',
            opacity: pending ? 0.7 : 1,
            padding: 0,
            flex: '0 0 auto',
          }}
        >
          <span
            aria-hidden
            className="transition-transform duration-300 ease-out"
            style={{
              position: 'absolute',
              top: 3,
              left: 3,
              width: 26,
              height: 26,
              borderRadius: 999,
              background: '#fff',
              boxShadow: '0 2px 6px rgba(0,0,0,.18)',
              transform: optimistic ? 'translateX(24px)' : 'translateX(0)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: optimistic ? '#0066cc' : '#86868b',
            }}
          >
            {optimistic ? (
              <Globe2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            ) : (
              <Lock className="h-3.5 w-3.5" strokeWidth={2.2} />
            )}
          </span>
        </button>
      </div>

      {/* Panel de enlace público — slide-in cuando isPublic = true */}
      <div
        aria-hidden={!optimistic}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: optimistic && publicUrl ? 120 : 0,
          opacity: optimistic && publicUrl ? 1 : 0,
          marginTop: optimistic && publicUrl ? 14 : 0,
        }}
      >
        {publicUrl && (
          <div
            className="flex items-center gap-2"
            style={{
              padding: '10px 12px',
              background: 'var(--color-fog)',
              borderRadius: 12,
              border: '1px solid var(--color-silver-mist)',
              transform: optimistic ? 'translateY(0)' : 'translateY(-8px)',
              transition: 'transform .3s ease-out',
            }}
          >
            <LinkIcon className="h-4 w-4 text-graphite flex-shrink-0" />
            <code
              style={{
                flex: 1,
                fontSize: 12,
                color: '#1d1d1f',
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
              className="transition-opacity hover:opacity-85 focus-ring"
              style={{
                background: copied ? '#1cb05c' : '#1d1d1f',
                color: '#fff',
                borderRadius: 999,
                border: 'none',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                flex: '0 0 auto',
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
