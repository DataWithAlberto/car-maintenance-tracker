import { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Landmark,
  Calendar,
  Trash2,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  CalendarClock,
  StickyNote,
  Calculator,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/ui/KpiCard';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { usePrestamo, type SyncStatus } from '../hooks/usePrestamo';
import { IMPORTE_INICIAL, prestamoService } from '../services/prestamo.service';
import { prestamoSyncStorage } from '../services/prestamoSync.service';
import { formatCurrency, formatDate, formatRelative } from '../utils/formatters';
import toast from 'react-hot-toast';

// ─── SVG progress ring ────────────────────────────────────────────────────────

const RING_SIZE = 128;
const RING_STROKE = 10;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const ProgressRing = ({ pct, color }: { pct: number; color: string }) => {
  const offset = RING_CIRC * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        fill="none"
        stroke="var(--color-silver-mist)"
        strokeWidth={RING_STROKE}
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  );
};

// ─── Person card ──────────────────────────────────────────────────────────────

const COLORS = {
  Celia: '#0071e3',
  Alberto: '#1a9e3f',
} as const;

interface PersonCardProps {
  name: 'Celia' | 'Alberto';
  pagado: number;
  pct: number;
}

const PersonCard = ({ name, pagado, pct }: PersonCardProps) => (
  <div
    className="bg-snow border border-silver-mist rounded-[20px] p-6 flex items-center gap-5"
    style={{ flex: 1, minWidth: 0 }}
  >
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <ProgressRing pct={pct} color={COLORS[name]} />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="tabular-nums text-ink"
          style={{
            fontFamily: 'var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 20,
            lineHeight: 1,
            letterSpacing: '-0.3px',
          }}
        >
          {pct.toFixed(1)}%
        </span>
        <span
          className="font-mono text-graphite mt-1 uppercase"
          style={{ fontSize: 9, letterSpacing: '0.1em' }}
        >
          del total
        </span>
      </div>
    </div>

    <div className="flex-1 min-w-0">
      <div
        className="text-ink"
        style={{
          fontFamily: 'var(--font-sf-pro-display)',
          fontWeight: 700,
          fontSize: 22,
          lineHeight: 1.1,
          letterSpacing: '-0.3px',
        }}
      >
        {name}
      </div>
      <div
        className="font-mono text-graphite uppercase mt-1"
        style={{ fontSize: 10, letterSpacing: '0.12em' }}
      >
        Pagado
      </div>
      <div
        className="text-ink tabular-nums mt-2"
        style={{
          fontFamily: 'var(--font-sf-pro-display)',
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: '-0.2px',
        }}
      >
        {formatCurrency(pagado)}
      </div>

      {/* Inline progress bar */}
      <div
        className="mt-3 rounded-full overflow-hidden"
        style={{ height: 4, background: 'var(--color-silver-mist)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: COLORS[name],
            borderRadius: 999,
            transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  </div>
);

// ─── Add payment form ─────────────────────────────────────────────────────────

interface AddPaymentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    fecha: string;
    importe: number;
    usuario: string;
    nota?: string | null;
  }) => Promise<void>;
}

const AddPaymentForm = ({ open, onClose, onSubmit }: AddPaymentFormProps) => {
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [importe, setImporte] = useState('');
  const [usuario, setUsuario] = useState<'Celia' | 'Alberto'>('Celia');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFecha(today);
    setImporte('');
    setUsuario('Celia');
    setNota('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(importe.replace(',', '.'));
    if (!val || val <= 0) {
      toast.error('Introduce un importe válido');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        fecha,
        importe: val,
        usuario,
        nota: nota.trim() ? nota.trim() : null,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--color-fog)',
    border: '1px solid var(--color-silver-mist)',
    borderRadius: 14,
    fontFamily: 'Inter, var(--font-sf-pro-text)',
    fontSize: 15,
    color: 'var(--color-ink)',
    outline: 'none',
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-graphite)',
    marginBottom: 6,
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Añadir pago"
      description="Registra un nuevo pago del préstamo del Ford Focus."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Fecha */}
        <div>
          <label style={labelStyle}>Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Importe */}
        <div>
          <label style={labelStyle}>Importe (€)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder="0,00"
            required
            style={inputStyle}
          />
        </div>

        {/* Usuario toggle */}
        <div>
          <label style={labelStyle}>¿Quién paga?</label>
          <div className="flex gap-2">
            {(['Celia', 'Alberto'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUsuario(u)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 12,
                  border: '1.5px solid',
                  borderColor: usuario === u ? COLORS[u] : 'var(--color-silver-mist)',
                  background: usuario === u ? COLORS[u] : 'var(--color-fog)',
                  color: usuario === u ? '#fff' : 'var(--color-ink)',
                  fontFamily: 'Inter, var(--font-sf-pro-text)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Nota (opcional) */}
        <div>
          <label style={labelStyle}>Nota (opcional)</label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="p. ej. cuota + intereses, pago doble…"
            maxLength={140}
            style={inputStyle}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 14,
              border: '1px solid var(--color-silver-mist)',
              background: 'var(--color-fog)',
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: 500,
              fontSize: 15,
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 2,
              padding: '12px 0',
              borderRadius: 14,
              border: 'none',
              background: saving ? 'var(--color-mist)' : 'var(--color-ink)',
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--color-snow)',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 180ms ease',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Sync settings modal ──────────────────────────────────────────────────────

interface SyncSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const SyncSettingsModal = ({ open, onClose, onSaved }: SyncSettingsModalProps) => {
  const existing = prestamoSyncStorage.load();
  const [url, setUrl] = useState(existing?.url ?? '');
  const [secret, setSecret] = useState(existing?.secret ?? '');

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--color-fog)',
    border: '1px solid var(--color-silver-mist)',
    borderRadius: 14,
    fontFamily: 'Inter, var(--font-sf-pro-text)',
    fontSize: 14,
    color: 'var(--color-ink)',
    outline: 'none',
  };
  const labelStyle: CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-graphite)',
    marginBottom: 6,
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimUrl = url.trim();
    const trimSecret = secret.trim();
    if (!trimUrl || !trimSecret) {
      toast.error('URL y secreto son obligatorios');
      return;
    }
    if (!trimUrl.startsWith('https://script.google.com/')) {
      toast.error('La URL debe ser la de despliegue de Apps Script');
      return;
    }
    prestamoSyncStorage.save({ url: trimUrl, secret: trimSecret });
    toast.success('Sync configurado');
    onSaved();
    onClose();
  };

  const handleDisconnect = () => {
    if (!confirm('¿Desconectar la sincronización con Google Sheets?')) return;
    prestamoSyncStorage.clear();
    setUrl('');
    setSecret('');
    toast.success('Sync desconectado');
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sincronizar con Google Sheets"
      description="Pega aquí la URL de despliegue del Apps Script y el secreto que configuraste."
      size="md"
    >
      <form onSubmit={handleSave} className="space-y-5">
        <div
          className="rounded-[14px] p-4 text-sm"
          style={{
            background: 'var(--color-fog)',
            border: '1px solid var(--color-silver-mist)',
            color: 'var(--color-graphite)',
            lineHeight: 1.5,
          }}
        >
          <strong className="text-ink">¿Primera vez?</strong> Crea una hoja de Google Sheets, pega
          el script <code>scripts/prestamo-sheets-sync.gs</code> en Extensiones → Apps Script,
          despliega como Web App («Cualquier usuario») y copia aquí la URL terminada en{' '}
          <code>/exec</code>.
        </div>

        <div>
          <label style={labelStyle}>URL del Web App</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Secreto compartido</label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="El mismo valor que pusiste en SECRET dentro del .gs"
            required
            style={inputStyle}
          />
        </div>

        <div className="flex gap-3 pt-1">
          {prestamoSyncStorage.load() && (
            <button
              type="button"
              onClick={handleDisconnect}
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid var(--color-silver-mist)',
                background: 'var(--color-fog)',
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 500,
                fontSize: 14,
                color: '#b64400',
                cursor: 'pointer',
              }}
            >
              Desconectar
            </button>
          )}
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 14,
              border: 'none',
              background: 'var(--color-ink)',
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--color-snow)',
              cursor: 'pointer',
            }}
          >
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Sync indicator chip ──────────────────────────────────────────────────────

const SyncIndicator = ({
  status,
  lastSync,
  onSync,
  onConfigure,
}: {
  status: SyncStatus;
  lastSync: string | null;
  onSync: () => void;
  onConfigure: () => void;
}) => {
  if (status === 'unconfigured') {
    return (
      <button
        onClick={onConfigure}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-silver-mist bg-snow text-ink hover:bg-fog transition-colors"
        style={{ fontSize: 13 }}
      >
        <Settings className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span className="font-text">Conectar Google Sheets</span>
      </button>
    );
  }

  const Icon = status === 'syncing' ? RefreshCw : status === 'error' ? AlertCircle : CheckCircle2;
  const color = status === 'syncing' ? '#0071e3' : status === 'error' ? '#d70015' : '#1a9e3f';
  const label =
    status === 'syncing'
      ? 'Sincronizando…'
      : status === 'error'
        ? 'Error de sync'
        : lastSync
          ? `Sync ${formatRelative(lastSync)}`
          : 'Sincronizado';

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={onSync}
        disabled={status === 'syncing'}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-silver-mist bg-snow text-ink hover:bg-fog transition-colors disabled:opacity-60"
        style={{ fontSize: 13 }}
      >
        <Icon
          className="h-3.5 w-3.5"
          strokeWidth={1.8}
          style={{
            color,
            animation: status === 'syncing' ? 'spin 1.2s linear infinite' : undefined,
          }}
        />
        <span className="font-text">{label}</span>
      </button>
      <button
        onClick={onConfigure}
        className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-silver-mist bg-snow text-graphite hover:text-ink hover:bg-fog transition-colors"
        aria-label="Ajustes de sincronización"
      >
        <Settings className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
};

// ─── Filter pills ─────────────────────────────────────────────────────────────

type FilterValue = 'all' | 'Celia' | 'Alberto';

const FilterPills = ({
  value,
  onChange,
  counts,
}: {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  counts: { all: number; Celia: number; Alberto: number };
}) => {
  const items: { key: FilterValue; label: string; color?: string }[] = [
    { key: 'all', label: `Todos · ${counts.all}` },
    { key: 'Celia', label: `Celia · ${counts.Celia}`, color: COLORS.Celia },
    { key: 'Alberto', label: `Alberto · ${counts.Alberto}`, color: COLORS.Alberto },
  ];
  return (
    <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-fog border border-silver-mist">
      {items.map((it) => {
        const active = value === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: 'none',
              background: active ? (it.color ?? 'var(--color-ink)') : 'transparent',
              color: active ? '#fff' : 'var(--color-graphite)',
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: active ? 600 : 500,
              fontSize: 12,
              letterSpacing: '-0.1px',
              cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
};

// ─── Monthly chart ────────────────────────────────────────────────────────────

const MonthlyChart = ({
  data,
}: {
  data: Array<{ label: string; Celia: number; Alberto: number; total: number }>;
}) => {
  const hasData = data.some((d) => d.total > 0);
  if (!hasData) {
    return (
      <div
        className="bg-snow border border-silver-mist rounded-[20px] px-6 py-10 text-center font-text text-graphite"
        style={{ fontSize: 13 }}
      >
        Aún no hay pagos en los últimos 12 meses para mostrar.
      </div>
    );
  }
  return (
    <div className="bg-snow border border-silver-mist rounded-[20px] px-5 pt-5 pb-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em' }}
        >
          Pagos mensuales · últimos 12 meses
        </span>
        <div className="inline-flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 font-mono uppercase text-graphite"
            style={{ fontSize: 9, letterSpacing: '0.1em' }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: COLORS.Celia,
                display: 'inline-block',
              }}
            />
            Celia
          </span>
          <span
            className="inline-flex items-center gap-1.5 font-mono uppercase text-graphite"
            style={{ fontSize: 9, letterSpacing: '0.1em' }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: COLORS.Alberto,
                display: 'inline-block',
              }}
            />
            Alberto
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} barSize={18} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 10,
              fill: 'var(--color-mist)',
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 10,
              fill: 'var(--color-mist)',
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
          <Tooltip
            formatter={(val, name) => [formatCurrency(Number(val)), String(name)]}
            contentStyle={{
              background: 'var(--color-snow)',
              border: '1px solid var(--color-silver-mist)',
              borderRadius: 12,
              boxShadow: 'none',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              padding: '8px 14px',
            }}
            labelStyle={{
              color: 'var(--color-ink)',
              fontWeight: 500,
              fontSize: 13,
              marginBottom: 2,
            }}
            itemStyle={{ color: 'var(--color-graphite)', fontSize: 13 }}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          />
          <Bar dataKey="Celia" stackId="m" fill={COLORS.Celia} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Alberto" stackId="m" fill={COLORS.Alberto} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Projection / Balance / Pace cards ────────────────────────────────────────

const formatMonthYear = (d: Date): string =>
  d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

const ProjectionCard = ({
  projectedEndDate,
  monthsRemaining,
  saldoPendiente,
}: {
  projectedEndDate: Date | null;
  monthsRemaining: number | null;
  saldoPendiente: number;
}) => {
  const finished = saldoPendiente <= 0;
  const label = finished
    ? 'Préstamo liquidado'
    : projectedEndDate
      ? formatMonthYear(projectedEndDate)
      : '—';
  const hint = finished
    ? '¡Hecho! Ya no queda saldo pendiente.'
    : monthsRemaining != null
      ? `${monthsRemaining} ${monthsRemaining === 1 ? 'mes' : 'meses'} al ritmo actual`
      : 'Registra algunos pagos para estimar el fin';

  return (
    <div className="bg-snow border border-silver-mist rounded-[20px] p-5 flex items-start gap-4 flex-1 min-w-0">
      <div
        className="shrink-0 h-11 w-11 rounded-[12px] flex items-center justify-center"
        style={{ background: finished ? '#1a9e3f1a' : '#0071e31a' }}
      >
        <CalendarClock
          className="h-5 w-5"
          strokeWidth={1.8}
          style={{ color: finished ? '#1a9e3f' : '#0071e3' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '0.12em' }}
        >
          Fecha estimada de fin
        </div>
        <div
          className="text-ink tabular-nums mt-1.5 capitalize"
          style={{
            fontFamily: 'var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.3px',
            lineHeight: 1.1,
          }}
        >
          {label}
        </div>
        <div className="font-text text-graphite mt-1" style={{ fontSize: 12.5 }}>
          {hint}
        </div>
      </div>
    </div>
  );
};

const BalanceCard = ({ delta, leader }: { delta: number; leader: 'Celia' | 'Alberto' | null }) => {
  const balanced = leader == null || delta < 0.01;
  const color = balanced ? '#1a9e3f' : COLORS[leader!];
  const half = delta / 2;

  return (
    <div className="bg-snow border border-silver-mist rounded-[20px] p-5 flex items-start gap-4 flex-1 min-w-0">
      <div
        className="shrink-0 h-11 w-11 rounded-[12px] flex items-center justify-center"
        style={{ background: `${color}1a` }}
      >
        <Scale className="h-5 w-5" strokeWidth={1.8} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '0.12em' }}
        >
          Balance entre personas
        </div>
        {balanced ? (
          <>
            <div
              className="text-ink mt-1.5"
              style={{
                fontFamily: 'var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: '-0.3px',
                lineHeight: 1.1,
              }}
            >
              Empate técnico
            </div>
            <div className="font-text text-graphite mt-1" style={{ fontSize: 12.5 }}>
              Habéis aportado prácticamente lo mismo.
            </div>
          </>
        ) : (
          <>
            <div
              className="text-ink tabular-nums mt-1.5"
              style={{
                fontFamily: 'var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: '-0.3px',
                lineHeight: 1.1,
              }}
            >
              <span style={{ color }}>{leader}</span> +{formatCurrency(delta)}
            </div>
            <div className="font-text text-graphite mt-1" style={{ fontSize: 12.5 }}>
              Para igualar, {leader === 'Celia' ? 'Alberto' : 'Celia'} debería aportar{' '}
              <span className="text-ink font-medium tabular-nums">{formatCurrency(half)}</span> más.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const PaceKpi = ({
  avgMonthly,
  pace,
}: {
  avgMonthly: number;
  pace: 'ahead' | 'behind' | 'ontrack';
}) => {
  const cfg = {
    ahead: { Icon: TrendingUp, color: '#1a9e3f', label: 'Por encima' },
    behind: { Icon: TrendingDown, color: '#b64400', label: 'Por debajo' },
    ontrack: { Icon: Minus, color: 'var(--color-graphite)', label: 'En ritmo' },
  } as const;
  const { Icon, color, label } = cfg[pace];
  return (
    <div className="bg-snow border border-silver-mist rounded-[20px] p-5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '0.12em' }}
        >
          Cuota media / mes
        </span>
        <span
          className="inline-flex items-center gap-1 px-2 h-6 rounded-full"
          style={{
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            color,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Inter, var(--font-sf-pro-text)',
          }}
        >
          <Icon className="h-3 w-3" strokeWidth={2} />
          {label}
        </span>
      </div>
      <div
        className="text-ink tabular-nums mt-2"
        style={{
          fontFamily: 'var(--font-sf-pro-display)',
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '-0.4px',
          lineHeight: 1,
        }}
      >
        {formatCurrency(avgMonthly)}
      </div>
      <div className="font-text text-graphite mt-1.5" style={{ fontSize: 12.5 }}>
        Media desde el primer pago registrado
      </div>
    </div>
  );
};

// ─── Simulador de cuota fija ─────────────────────────────────────────────────

const SimuladorCuota = ({
  saldoPendiente,
  defaultCuota,
}: {
  saldoPendiente: number;
  defaultCuota: number;
}) => {
  const [raw, setRaw] = useState(defaultCuota > 0 ? defaultCuota.toFixed(2) : '');

  const result = useMemo(() => {
    const cuota = parseFloat(raw.replace(',', '.'));
    if (!cuota || cuota <= 0 || saldoPendiente <= 0) return null;
    const meses = Math.ceil(saldoPendiente / cuota);
    const now = new Date();
    const fin = new Date(now.getFullYear(), now.getMonth() + meses, 1);
    const label = fin.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return { meses, label, cuota };
  }, [raw, saldoPendiente]);

  if (saldoPendiente <= 0) return null;

  return (
    <div className="bg-snow border border-silver-mist rounded-[20px] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: '#0071e31a' }}
        >
          <Calculator className="h-4.5 w-4.5" strokeWidth={1.8} style={{ color: '#0071e3' }} />
        </div>
        <div>
          <div
            className="font-mono uppercase text-graphite"
            style={{ fontSize: 10, letterSpacing: '0.12em' }}
          >
            Simulador de cuota fija
          </div>
          <div className="font-text text-graphite mt-0.5" style={{ fontSize: 12.5 }}>
            ¿Cuándo acabaría si pago una cantidad fija cada mes?
          </div>
        </div>
      </div>

      {/* Input row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="number"
            min="1"
            step="0.01"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Cuota mensual…"
            style={{
              width: '100%',
              padding: '11px 16px 11px 42px',
              background: 'var(--color-fog)',
              border: '1px solid var(--color-silver-mist)',
              borderRadius: 13,
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontSize: 15,
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 font-text text-graphite pointer-events-none"
            style={{ fontSize: 14 }}
          >
            €
          </span>
        </div>

        {result && (
          <div
            className="shrink-0 font-text text-graphite"
            style={{ fontSize: 13, lineHeight: 1.4 }}
          >
            →
          </div>
        )}

        {result && (
          <div className="shrink-0 text-right">
            <div
              className="text-ink capitalize tabular-nums"
              style={{
                fontFamily: 'var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: '-0.2px',
                lineHeight: 1.1,
              }}
            >
              {result.label}
            </div>
            <div className="font-text text-graphite mt-0.5" style={{ fontSize: 12 }}>
              {result.meses} {result.meses === 1 ? 'mes' : 'meses'}
            </div>
          </div>
        )}
      </div>

      {/* Contextual hint */}
      {result && (
        <div
          className="mt-3 rounded-[10px] px-4 py-2.5 font-text text-graphite"
          style={{
            background: 'var(--color-fog)',
            border: '1px solid var(--color-silver-mist)',
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          Pagando{' '}
          <span className="text-ink font-semibold tabular-nums">
            {formatCurrency(result.cuota)}
          </span>{' '}
          al mes quedarían{' '}
          <span className="text-ink font-semibold tabular-nums">{result.meses}</span>{' '}
          {result.meses === 1 ? 'cuota' : 'cuotas'} sobre{' '}
          <span className="text-ink font-semibold tabular-nums">
            {formatCurrency(saldoPendiente)}
          </span>{' '}
          pendientes. El último pago sería en{' '}
          <span className="text-ink font-semibold capitalize">{result.label}</span>.
        </div>
      )}

      {!result && raw && parseFloat(raw.replace(',', '.')) > 0 && (
        <div className="mt-3 font-text text-graphite" style={{ fontSize: 12.5 }}>
          Introduce un importe mayor que 0.
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const PrestamoPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const navigate = useNavigate();
  const { movimientos, stats, loading, syncStatus, lastSync, create, remove, sync } = usePrestamo(
    selectedVehicle?.id,
  );
  const [showForm, setShowForm] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [, forceRender] = useState(0);

  const advanced = useMemo(
    () => prestamoService.calcAdvancedStats(movimientos, stats),
    [movimientos, stats],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return movimientos;
    return movimientos.filter((m) => m.usuario === filter);
  }, [movimientos, filter]);

  const counts = useMemo(
    () => ({
      all: movimientos.length,
      Celia: movimientos.filter((m) => m.usuario === 'Celia').length,
      Alberto: movimientos.filter((m) => m.usuario === 'Alberto').length,
    }),
    [movimientos],
  );

  if (!selectedVehicle) {
    navigate('/dashboard');
    return null;
  }

  const handleCreate = async (data: {
    fecha: string;
    importe: number;
    usuario: string;
    nota?: string | null;
  }) => {
    await create(data);
    toast.success('Pago registrado');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await remove(id);
      toast.success('Movimiento eliminado');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const progressPct = Math.min((stats.totalPagado / IMPORTE_INICIAL) * 100, 100);

  return (
    <div className="px-6 sm:px-10 py-10">
      {/* ── Header ── */}
      <header className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <span className="eyebrow">
            {selectedVehicle.brand} {selectedVehicle.model}
            {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 56px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            Préstamo.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            {formatCurrency(IMPORTE_INICIAL)} importe inicial ·{' '}
            <span className="text-ink font-medium tabular-nums">{progressPct.toFixed(1)}%</span>{' '}
            amortizado
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SyncIndicator
            status={syncStatus}
            lastSync={lastSync}
            onSync={sync}
            onConfigure={() => setShowSyncSettings(true)}
          />
          <Button
            variant="accent"
            onClick={() => setShowForm(true)}
            iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
          >
            Añadir pago
          </Button>
        </div>
      </header>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <KpiCard
          icon={Landmark}
          label="Saldo pendiente"
          value={formatCurrency(stats.saldoPendiente)}
          hint={`de ${formatCurrency(IMPORTE_INICIAL)} iniciales`}
          tone={stats.saldoPendiente > 0 ? 'warn' : 'success'}
        />
        <KpiCard
          label="Total amortizado"
          value={formatCurrency(stats.totalPagado)}
          hint={`${movimientos.length} ${movimientos.length === 1 ? 'pago' : 'pagos'} registrados`}
          tone="brand"
        />
        <PaceKpi avgMonthly={advanced.avgMonthly} pace={advanced.pace} />
      </div>

      {/* ── Global progress bar ── */}
      <div className="bg-snow border border-silver-mist rounded-[20px] px-6 py-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-mono uppercase text-graphite"
            style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em' }}
          >
            Progreso global
          </span>
          <span
            className="font-mono text-ink tabular-nums"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            {progressPct.toFixed(1)}%
          </span>
        </div>
        <div
          className="rounded-full overflow-hidden"
          style={{ height: 6, background: 'var(--color-silver-mist)' }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'var(--color-ink)',
              borderRadius: 999,
              transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
      </div>

      {/* ── Person cards ── */}
      <div className="flex gap-3 mb-4 flex-col sm:flex-row">
        <PersonCard name="Celia" pagado={stats.pagadoCelia} pct={stats.pctCelia} />
        <PersonCard name="Alberto" pagado={stats.pagadoAlberto} pct={stats.pctAlberto} />
      </div>

      {/* ── Projection + Balance ── */}
      <div className="flex gap-3 mb-4 flex-col sm:flex-row">
        <ProjectionCard
          projectedEndDate={advanced.projectedEndDate}
          monthsRemaining={advanced.monthsRemaining}
          saldoPendiente={stats.saldoPendiente}
        />
        <BalanceCard delta={advanced.balanceDelta} leader={advanced.balanceLeader} />
      </div>

      {/* ── Simulador de cuota fija ── */}
      <div className="mb-4">
        <SimuladorCuota saldoPendiente={stats.saldoPendiente} defaultCuota={advanced.avgMonthly} />
      </div>

      {/* ── Monthly chart ── */}
      <div className="mb-8">
        <MonthlyChart data={advanced.monthly} />
      </div>

      {/* ── History ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2
          className="text-ink"
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: '-0.3px',
          }}
        >
          Historial
        </h2>
        <FilterPills value={filter} onChange={setFilter} counts={counts} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : movimientos.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Sin pagos registrados"
          description="Registra las cuotas del préstamo para llevar el control de quién ha pagado cada mes."
          action={
            <Button
              variant="accent"
              onClick={() => setShowForm(true)}
              iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
            >
              Registrar primer pago
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <div
          className="bg-snow border border-silver-mist rounded-[14px] px-6 py-10 text-center font-text text-graphite"
          style={{ fontSize: 13 }}
        >
          Sin pagos de {filter} todavía.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m, i) => (
            <li
              key={m.id}
              className="stagger-item group bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center gap-4"
              style={{ '--i': Math.min(i, 10) } as CSSProperties}
            >
              {/* Color dot */}
              <div
                className="shrink-0 h-11 w-11 rounded-[10px] flex items-center justify-center"
                style={{ background: `${COLORS[m.usuario]}1a` }}
              >
                <span
                  className="font-display font-bold"
                  style={{ fontSize: 15, color: COLORS[m.usuario] }}
                >
                  {m.usuario[0]}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-text text-ink font-medium" style={{ fontSize: 15 }}>
                    {m.usuario}
                  </span>
                  <span
                    className="font-display text-ink font-semibold tabular-nums shrink-0"
                    style={{ fontSize: 17, letterSpacing: '-0.1px' }}
                  >
                    {formatCurrency(m.importe)}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 mt-1 text-graphite font-text"
                  style={{ fontSize: 13 }}
                >
                  <Calendar className="h-3 w-3" strokeWidth={1.6} />
                  {formatDate(m.fecha)}
                </div>
                {m.nota && (
                  <div
                    className="flex items-start gap-1.5 mt-1.5 text-graphite font-text"
                    style={{ fontSize: 12.5, lineHeight: 1.4 }}
                  >
                    <StickyNote
                      className="h-3 w-3 mt-0.5 shrink-0"
                      strokeWidth={1.6}
                      style={{ color: COLORS[m.usuario] }}
                    />
                    <span className="truncate">{m.nota}</span>
                  </div>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(m.id)}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-graphite hover:text-caution hover:bg-fog transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Eliminar pago"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddPaymentForm open={showForm} onClose={() => setShowForm(false)} onSubmit={handleCreate} />

      <SyncSettingsModal
        open={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
        onSaved={() => {
          // El hook lee `prestamoSyncService.isConfigured()` desde estado interno.
          // Forzamos un re-render del padre para que la URL recién guardada se
          // refleje en el indicador; el siguiente sync() recoge la config.
          forceRender((n) => n + 1);
          sync();
        }}
      />
    </div>
  );
};
