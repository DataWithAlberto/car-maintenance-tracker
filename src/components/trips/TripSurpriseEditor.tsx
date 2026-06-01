import { useState } from 'react';
import { Gift, Sparkles, Eye, Send, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SurpriseConfig, SurpriseAnimation } from '../../types';
import { SurpriseAudioInput } from './SurpriseAudioInput';
import { SurpriseCoverInput } from './SurpriseCoverInput';
import { SurpriseQRCode } from './SurpriseQRCode';
import { SurpriseHintsEditor } from './SurpriseHintsEditor';
import { SurpriseHintsScheduler } from './SurpriseHintsScheduler';
import { SurpriseRouteStopsEditor } from './SurpriseRouteStopsEditor';
import { SurpriseMusicInput } from './SurpriseMusicInput';
import { SurpriseFunFactsEditor } from './SurpriseFunFactsEditor';
import { SurpriseBoardingPass } from './SurpriseBoardingPass';

interface Props {
  tripId: string;
  enabled: boolean;
  config?: SurpriseConfig | null;
  shareToken?: string | null;
  destination?: string | null;
  startDate?: string | null;
  startLocation?: string | null;
  onChange: (enabled: boolean, config: SurpriseConfig | null) => Promise<void>;
}

const ANIMATIONS: { value: SurpriseAnimation; label: string; emoji: string }[] = [
  { value: 'gift', label: 'Caja de regalo', emoji: '🎁' },
  { value: 'scratch', label: 'Rasca y gana', emoji: '✨' },
  { value: 'envelope', label: 'Sobre', emoji: '✉️' },
];

export const TripSurpriseEditor = ({
  tripId,
  enabled,
  config,
  shareToken,
  destination,
  startDate,
  startLocation,
  onChange,
}: Props) => {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SurpriseConfig>({
    message: config?.message ?? '',
    reveal_date: config?.reveal_date ?? '',
    animation: config?.animation ?? 'gift',
    cover_url: config?.cover_url ?? null,
    audio_url: config?.audio_url ?? null,
    reactions: config?.reactions ?? undefined,
    reason: config?.reason ?? '',
    hints: config?.hints ?? [],
    fun_facts: config?.fun_facts ?? [],
    route_stops: config?.route_stops ?? [],
    music_url: config?.music_url ?? null,
    opened_at: config?.opened_at ?? null,
  });

  const openedAt = config?.opened_at ?? null;

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

  // Auto-guarda los uploads de audio e imagen sin que el usuario tenga que
  // pulsar «Guardar» (los inputs ya muestran toast de éxito)
  const patchAndSave = async (patch: Partial<SurpriseConfig>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (enabled) {
      await onChange(true, next);
    }
  };

  const publicUrl =
    shareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/viajes/surprise/${shareToken}`
      : '';
  const whatsappUrl = publicUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Tengo una sorpresa para ti ✦ ${publicUrl}`)}`
    : '';

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
            background: enabled ? '#FF5A5F' : 'var(--surface-card)',
            color: enabled ? '#fff' : 'var(--color-ink)',
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
              background: 'var(--surface-card)',
              border: '1px solid var(--color-silver-mist)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 14,
              color: 'var(--color-ink)',
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
                background: 'var(--surface-card)',
                border: '1px solid var(--color-silver-mist)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 14,
                color: 'var(--color-ink)',
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
                background: 'var(--surface-card)',
                border: '1px solid var(--color-silver-mist)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 14,
                color: 'var(--color-ink)',
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

          <textarea
            value={draft.reason ?? ''}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            placeholder="¿Por qué te llevo allí? (aparecerá con efecto máquina de escribir tras el reveal)"
            rows={3}
            style={{
              width: '100%',
              background: 'var(--surface-card)',
              border: '1px solid var(--color-silver-mist)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 14,
              color: 'var(--color-ink)',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.45,
            }}
          />

          <SurpriseRouteStopsEditor
            value={draft.route_stops ?? []}
            onChange={(route_stops) => setDraft({ ...draft, route_stops })}
          />

          <SurpriseCoverInput
            tripId={tripId}
            value={draft.cover_url}
            onChange={(url) => patchAndSave({ cover_url: url })}
          />
          <SurpriseAudioInput
            tripId={tripId}
            value={draft.audio_url}
            onChange={(url) => patchAndSave({ audio_url: url })}
          />
          <SurpriseMusicInput
            tripId={tripId}
            value={draft.music_url}
            onChange={(url) => patchAndSave({ music_url: url })}
          />

          <SurpriseHintsEditor
            value={draft.hints ?? []}
            onChange={(hints) => setDraft({ ...draft, hints })}
          />

          <SurpriseHintsScheduler
            hints={draft.hints ?? []}
            revealDate={draft.reveal_date}
            publicUrl={publicUrl}
          />

          <SurpriseFunFactsEditor
            destination={destination ?? null}
            value={draft.fun_facts ?? []}
            onChange={(fun_facts) => setDraft({ ...draft, fun_facts })}
          />

          {openedAt && (
            <div
              className="flex items-center"
              style={{
                gap: 8,
                padding: '8px 12px',
                background: 'rgba(28,176,92,.10)',
                border: '1px solid rgba(28,176,92,.3)',
                borderRadius: 10,
                fontSize: 12,
                color: '#1cb05c',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Sorpresa abierta el{' '}
              {format(parseISO(openedAt), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
            </div>
          )}

          <div
            className="flex items-center justify-between flex-wrap"
            style={{ gap: 8, paddingTop: 4 }}
          >
            <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
              {shareToken && (
                <a
                  href={`/viajes/surprise/${shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-75"
                  style={{
                    background: 'transparent',
                    color: '#FF5A5F',
                    borderRadius: 999,
                    border: '1px solid #FF5A5F',
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Vista previa
                </a>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-75"
                  style={{
                    background: '#25D366',
                    color: '#fff',
                    borderRadius: 999,
                    border: 'none',
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
              {publicUrl && <SurpriseQRCode url={publicUrl} />}
              {destination && (
                <SurpriseBoardingPass
                  destination={destination}
                  startDate={startDate}
                  startLocation={startLocation}
                  shareToken={shareToken}
                />
              )}
            </div>
            <button
              onClick={saveDraft}
              type="button"
              disabled={saving}
              className="transition-opacity hover:opacity-85"
              style={{
                background: 'var(--color-ink)',
                color: 'var(--color-snow)',
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
