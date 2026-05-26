import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Landmark, Calendar, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/ui/KpiCard';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { usePrestamo } from '../hooks/usePrestamo';
import { IMPORTE_INICIAL } from '../services/prestamo.service';
import { formatCurrency, formatDate } from '../utils/formatters';
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
    descripcion?: string;
  }) => Promise<void>;
}

const AddPaymentForm = ({ open, onClose, onSubmit }: AddPaymentFormProps) => {
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [importe, setImporte] = useState('');
  const [usuario, setUsuario] = useState<'Celia' | 'Alberto'>('Celia');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFecha(today);
    setImporte('');
    setUsuario('Celia');
    setDescripcion('');
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
      await onSubmit({ fecha, importe: val, usuario, descripcion: descripcion || undefined });
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

        {/* Descripción */}
        <div>
          <label style={labelStyle}>Descripción (opcional)</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Cuota mensual, adelanto…"
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

// ─── Main page ────────────────────────────────────────────────────────────────

export const PrestamoPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const navigate = useNavigate();
  const { movimientos, stats, loading, create, remove } = usePrestamo(selectedVehicle?.id);
  const [showForm, setShowForm] = useState(false);

  if (!selectedVehicle) {
    navigate('/dashboard');
    return null;
  }

  const handleCreate = async (data: {
    fecha: string;
    importe: number;
    usuario: string;
    descripcion?: string;
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
        <Button
          variant="accent"
          onClick={() => setShowForm(true)}
          iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
        >
          Añadir pago
        </Button>
      </header>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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
      <div className="flex gap-3 mb-8 flex-col sm:flex-row">
        <PersonCard name="Celia" pagado={stats.pagadoCelia} pct={stats.pctCelia} />
        <PersonCard name="Alberto" pagado={stats.pagadoAlberto} pct={stats.pctAlberto} />
      </div>

      {/* ── History ── */}
      <div className="flex items-center justify-between mb-4">
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
        <span
          className="font-mono text-graphite uppercase"
          style={{ fontSize: 10, letterSpacing: '0.12em' }}
        >
          {movimientos.length} {movimientos.length === 1 ? 'movimiento' : 'movimientos'}
        </span>
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
      ) : (
        <ul className="space-y-2">
          {movimientos.map((m, i) => (
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
                    {m.descripcion && (
                      <span className="text-graphite font-normal ml-2 truncate">
                        · {m.descripcion}
                      </span>
                    )}
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
    </div>
  );
};
