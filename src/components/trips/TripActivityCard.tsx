import { useState, useTransition } from 'react';
import type { ChangeEvent } from 'react';
import {
  ExternalLink,
  MapPin,
  Star,
  Calendar,
  Hash,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TripActivity, CreateTripActivityInput } from '../../types';
import { getBookingTheme, BOOKING_TYPE_LABEL, type BookingTheme } from '../../utils/bookingTheme';
import { TripActivityPhotos } from './TripActivityPhotos';

interface Props {
  activity: TripActivity;
  editable?: boolean;
  onSave?: (id: string, patch: Partial<CreateTripActivityInput>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /** Si se provee junto con userId, se renderiza el carrusel de fotos vinculadas. */
  userId?: string | null;
  vehicleId?: string | null;
  /** Oculta el precio (p. ej. en la página de sorpresa pública). */
  hidePrice?: boolean;
}

const fmtMoney = (n: number, c = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: c }).format(n);
const fmtDate = (iso: string) => format(parseISO(iso), 'd MMM · HH:mm', { locale: es });

export const TripActivityCard = ({
  activity,
  editable = true,
  onSave,
  onDelete,
  userId = null,
  vehicleId = null,
  hidePrice = false,
}: Props) => {
  const t = getBookingTheme(activity.provider);
  const isLodging = activity.type === 'lodging';

  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<Partial<CreateTripActivityInput>>({});
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft({
      title: activity.title,
      price: activity.price,
      currency: activity.currency,
      booking_url: activity.booking_url,
      confirmation_code: activity.confirmation_code,
      notes: activity.notes,
      start_datetime: activity.start_datetime,
      end_datetime: activity.end_datetime,
    });
    setIsEditing(true);
  };

  const cancel = () => {
    setDraft({});
    setIsEditing(false);
  };

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      startTransition(() => setIsEditing(false));
      await onSave(activity.id, draft);
    } catch {
      setIsEditing(true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    await onDelete(activity.id);
  };

  return (
    <article
      style={{
        background: t.surface,
        border: `1px solid ${isEditing ? t.accent : t.border}`,
        borderLeft: `3px solid ${t.accent}`,
        borderRadius: t.radius,
        fontFamily: t.fontFamily,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        transition: 'border-color .2s ease, box-shadow .2s ease',
        boxShadow: isEditing ? `0 0 0 3px ${t.accent}22` : 'none',
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: '.16em', color: t.textMuted }}
          >
            {BOOKING_TYPE_LABEL[activity.type]}
          </span>
          <ProviderChip theme={t} />
          {activity.is_candidate && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '.08em',
                padding: '3px 8px',
                borderRadius: 999,
                border: `1px dashed ${t.accent}`,
                color: t.accent,
                textTransform: 'uppercase',
              }}
            >
              Candidato
            </span>
          )}
        </div>

        {editable && !isEditing && !confirmDelete && (
          <div className="flex items-center" style={{ gap: 4 }}>
            {onSave && (
              <IconButton onClick={startEdit} label="Editar" tint={t.textMuted}>
                <Pencil className="h-4 w-4" strokeWidth={1.6} />
              </IconButton>
            )}
            {onDelete && (
              <IconButton onClick={() => setConfirmDelete(true)} label="Eliminar" tint="#b64400">
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </IconButton>
            )}
          </div>
        )}
      </header>

      {!isEditing && !confirmDelete && (
        <ReadView activity={activity} theme={t} isLodging={isLodging} hidePrice={hidePrice} />
      )}

      {isEditing && (
        <EditView
          theme={t}
          draft={draft}
          onChange={setDraft}
          onCancel={cancel}
          onSave={save}
          saving={saving}
        />
      )}

      {!confirmDelete && userId && (
        <TripActivityPhotos
          tripId={activity.trip_id}
          activityId={activity.id}
          userId={userId}
          vehicleId={vehicleId}
          theme={t}
          editable={editable}
        />
      )}

      {confirmDelete && (
        <div
          className="flex items-center justify-between confirm-delete-panel"
          style={{
            borderRadius: 12,
            padding: '12px 14px',
            gap: 12,
          }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <AlertTriangle className="h-5 w-5 text-warn-ink" />
            <p className="text-warn-ink" style={{ fontSize: 13, margin: 0 }}>
              ¿Eliminar <b>{activity.title}</b> del viaje?
            </p>
          </div>
          <div className="flex" style={{ gap: 6 }}>
            <button
              onClick={() => setConfirmDelete(false)}
              type="button"
              className="text-warn-ink"
              style={{
                background: 'transparent',
                border: '1px solid currentColor',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={remove}
              type="button"
              style={{
                background: '#b64400',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

/* ──────────── Sub-componentes ──────────── */

const ProviderChip = ({ theme: t }: { theme: BookingTheme }) => (
  <span
    style={{
      padding: '3px 8px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.04em',
      color: t.badgeShape === 'rounded' ? t.accent : t.onAccent,
      background: t.badgeShape === 'rounded' ? 'transparent' : t.accent,
      border: t.badgeShape === 'rounded' ? `1px solid ${t.accent}` : 'none',
      borderRadius: t.badgeShape === 'square' ? 3 : 999,
      textTransform: 'uppercase',
    }}
  >
    {t.label}
  </span>
);

interface IconButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tint: string;
}
const IconButton = ({ children, onClick, label, tint }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="transition-colors hover:bg-fog"
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 6,
      borderRadius: 8,
      color: tint,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </button>
);

interface ReadViewProps {
  activity: TripActivity;
  theme: BookingTheme;
  isLodging: boolean;
  hidePrice?: boolean;
}
const ReadView = ({ activity, theme: t, isLodging, hidePrice = false }: ReadViewProps) => (
  <>
    <div className="flex items-start justify-between gap-3">
      <h3
        style={{
          fontFamily: t.fontFamily,
          fontWeight: activity.provider === 'airbnb' ? 600 : 700,
          fontSize: 18,
          lineHeight: 1.25,
          color: t.textPrimary,
          letterSpacing: activity.provider === 'airbnb' ? 0 : '-0.2px',
          margin: 0,
        }}
      >
        {activity.title}
      </h3>
      {typeof activity.metadata?.rating === 'number' &&
        isLodging &&
        (activity.provider === 'booking' ? (
          <span
            style={{
              background: t.accent,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              padding: '4px 8px',
              borderRadius: 4,
              borderTopRightRadius: 0,
              minWidth: 36,
              textAlign: 'center',
            }}
          >
            {activity.metadata.rating.toFixed(1)}
          </span>
        ) : (
          <span className="flex items-center" style={{ gap: 4, color: t.textPrimary }}>
            <Star className="h-3.5 w-3.5" fill={t.accent} stroke={t.accent} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {activity.metadata.rating.toFixed(2)}
            </span>
          </span>
        ))}
    </div>

    <dl
      className="flex flex-wrap"
      style={{ gap: '6px 16px', color: t.textMuted, fontSize: 13, margin: 0 }}
    >
      {activity.metadata?.address && (
        <span className="flex items-center" style={{ gap: 6 }}>
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.6} />
          {activity.metadata.address}
        </span>
      )}
      <span className="flex items-center" style={{ gap: 6 }}>
        <Calendar className="h-3.5 w-3.5" strokeWidth={1.6} />
        {fmtDate(activity.start_datetime)}
        {activity.end_datetime && ` → ${fmtDate(activity.end_datetime)}`}
      </span>
      {activity.confirmation_code && (
        <span className="flex items-center" style={{ gap: 6 }}>
          <Hash className="h-3.5 w-3.5" strokeWidth={1.6} />
          <span className="font-mono" style={{ fontSize: 12 }}>
            {activity.confirmation_code}
          </span>
        </span>
      )}
    </dl>

    <footer
      className="flex items-center justify-between"
      style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginTop: 4 }}
    >
      {activity.price != null && !hidePrice ? (
        <span style={{ color: t.textPrimary, fontWeight: 700, fontSize: 16 }}>
          {fmtMoney(activity.price, activity.currency ?? 'EUR')}
        </span>
      ) : (
        <span />
      )}
      {activity.booking_url && (
        <a
          href={activity.booking_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center transition-opacity hover:opacity-85"
          style={{
            gap: 6,
            background: activity.provider === 'booking' ? t.onAccent : t.accent,
            color: activity.provider === 'booking' ? t.accent : t.onAccent,
            padding: '8px 14px',
            borderRadius: t.badgeShape === 'rounded' ? 999 : 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Ver reserva <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
        </a>
      )}
    </footer>
  </>
);

interface ThemedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  theme: BookingTheme;
}
const ThemedInput = ({ theme: t, style, ...props }: ThemedInputProps) => (
  <input
    {...props}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = t.accent;
      e.currentTarget.style.boxShadow = `0 0 0 3px ${t.accent}22`;
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = t.border;
      e.currentTarget.style.boxShadow = 'none';
    }}
    style={{
      width: '100%',
      background: 'var(--surface-card)',
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: '8px 12px',
      fontSize: 14,
      color: t.textPrimary,
      fontFamily: t.fontFamily,
      outline: 'none',
      transition: 'border-color .15s ease, box-shadow .15s ease',
      ...style,
    }}
  />
);

interface EditViewProps {
  theme: BookingTheme;
  draft: Partial<CreateTripActivityInput>;
  onChange: (next: Partial<CreateTripActivityInput>) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}
const EditView = ({ theme: t, draft, onChange, onCancel, onSave, saving }: EditViewProps) => {
  const update = <K extends keyof CreateTripActivityInput>(
    k: K,
    v: CreateTripActivityInput[K] | undefined,
  ) => onChange({ ...draft, [k]: v });

  return (
    <div className="space-y-3">
      <ThemedInput
        theme={t}
        value={draft.title ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => update('title', e.target.value)}
        placeholder="Título"
      />
      <div className="grid grid-cols-2 gap-2">
        <ThemedInput
          theme={t}
          type="datetime-local"
          value={draft.start_datetime ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => update('start_datetime', e.target.value)}
        />
        <ThemedInput
          theme={t}
          type="number"
          step="0.01"
          value={draft.price ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            update('price', e.target.value ? parseFloat(e.target.value) : undefined)
          }
          placeholder="Precio"
        />
      </div>
      <ThemedInput
        theme={t}
        value={draft.booking_url ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          update('booking_url', e.target.value || undefined)
        }
        placeholder="URL de la reserva"
      />
      <textarea
        value={draft.notes ?? ''}
        onChange={(e) => update('notes', e.target.value || undefined)}
        placeholder="Notas"
        rows={2}
        style={{
          width: '100%',
          background: 'var(--surface-card)',
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 14,
          color: t.textPrimary,
          fontFamily: t.fontFamily,
          outline: 'none',
          resize: 'vertical',
        }}
      />

      <div
        className="flex items-center justify-end gap-2"
        style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}
      >
        <button
          onClick={onCancel}
          type="button"
          style={{
            background: 'transparent',
            border: `1px solid ${t.border}`,
            color: t.textMuted,
            borderRadius: 999,
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <X className="h-3.5 w-3.5" /> Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          type="button"
          style={{
            background: t.accent,
            border: 'none',
            color: t.onAccent,
            borderRadius: 999,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Check className="h-3.5 w-3.5" /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};
