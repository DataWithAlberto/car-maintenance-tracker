import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';
import { InsuranceForm } from '../components/insurance/InsuranceForm';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { insuranceService } from '../services/insurance.service';
import { INSURANCE_COVERAGE_LABELS } from '../utils/constants';
import type { InsuranceCoverage, InsurancePolicy } from '../types';
import type { InsuranceInput } from '../utils/validators';
import { formatCurrency } from '../utils/formatters';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

/* ─── Catálogo de coberturas ──────────────────────────────────────────────
   El modelo de datos guarda un único `coverage_type`. El detalle por cobertura
   se deriva: cada nivel incluye las N primeras coberturas de la lista. */
const COVERAGE_CATALOG: { label: string; meta: string }[] = [
  { label: 'Responsabilidad civil', meta: 'Ilim.' },
  { label: 'Rotura de lunas', meta: '100%' },
  { label: 'Robo del vehículo', meta: 'Valor real' },
  { label: 'Incendio', meta: 'Total' },
  { label: 'Fenómenos atmosféricos', meta: 'Total' },
  { label: 'Asistencia en carretera', meta: '0 km' },
  { label: 'Defensa jurídica', meta: '6 000 €' },
  { label: 'Accidentes ocupantes', meta: '30 000 €' },
  { label: 'Daños propios', meta: 'Valor venal' },
  { label: 'Todo riesgo · franq.', meta: 'Franq. 300 €' },
];

const INCLUDED_BY_TYPE: Record<InsuranceCoverage, number> = {
  terceros: 1,
  terceros_ampliado: 8,
  todo_riesgo: 9,
  todo_riesgo_franquicia: 10,
};

const FREQ_PER_YEAR: Record<string, number> = {
  mensual: 12,
  trimestral: 4,
  semestral: 2,
  anual: 1,
};

const MONTH_INITIALS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

const dotDate = (d: Date) => format(d, 'dd·MM·yy');

/* Escudo decorativo — marca de agua, sin interacción. */
const ShieldWatermark = ({
  size,
  stroke,
  className,
  style,
}: {
  size: number;
  stroke: string;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    aria-hidden
    className={className}
    style={{ pointerEvents: 'none', position: 'absolute', ...style }}
  >
    <path
      d="M60 10 L102 27 L102 62 C102 92 84 110 60 118 C36 110 18 92 18 62 L18 27 Z"
      stroke={stroke}
      strokeWidth={0.6}
    />
    <path
      d="M60 26 L86 37 L86 61 C86 80 75 92 60 98 C45 92 34 80 34 61 L34 37 Z"
      stroke={stroke}
      strokeWidth={0.6}
    />
  </svg>
);

const toInput = (p: InsurancePolicy): Partial<InsuranceInput> => ({
  provider: p.provider,
  policy_number: p.policy_number ?? undefined,
  coverage_type: p.coverage_type,
  premium_amount: p.premium_amount ?? undefined,
  payment_frequency: p.payment_frequency ?? undefined,
  start_date: p.start_date,
  end_date: p.end_date,
  deductible: p.deductible ?? undefined,
  contact_phone: p.contact_phone ?? undefined,
  notes: p.notes ?? undefined,
});

export const InsurancePage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);
  const [alertOn, setAlertOn] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    insuranceService
      .getByVehicle(selectedVehicle.id)
      .then(setPolicies)
      .finally(() => setLoading(false));
  }, [navigate, selectedVehicle]);

  /* Póliza destacada: la activa más próxima a vencer; si no hay ninguna
     vigente, la vencida más reciente. */
  const policy = useMemo<InsurancePolicy | null>(() => {
    if (policies.length === 0) return null;
    const sorted = [...policies].sort((a, b) => (a.end_date < b.end_date ? -1 : 1));
    const today = new Date();
    const active = sorted.filter((p) => parseISO(p.end_date) >= today);
    return active[0] ?? sorted[sorted.length - 1];
  }, [policies]);

  if (!selectedVehicle || !user) return null;

  const handleSubmit = async (data: InsuranceInput) => {
    if (editing) {
      const updated = await insuranceService.update(editing.id, data);
      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success('Póliza actualizada');
    } else {
      const p = await insuranceService.create(selectedVehicle.id, user.id, data);
      setPolicies((prev) => [p, ...prev]);
      toast.success('Póliza añadida');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta póliza?')) return;
    const snapshot = policies;
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    try {
      await insuranceService.delete(id);
      toast.success('Póliza eliminada');
    } catch {
      setPolicies(snapshot);
      toast.error('No se pudo eliminar la póliza');
    }
  };

  /* ─── Loading ───────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="px-6 sm:px-10 py-10 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  /* ─── Estado vacío ──────────────────────────────────────────────────── */
  if (!policy) {
    return (
      <>
        <div className="px-6 sm:px-12 py-12 page-enter">
          <span
            className="font-mono uppercase block"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.18em',
              color: 'var(--color-mist)',
            }}
          >
            § Sin pólizas
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(64px, 9vw, 120px)',
              lineHeight: 0.92,
              letterSpacing: '-3px',
              margin: '16px 0 14px',
            }}
          >
            Sin seguro.
          </h1>
          <p
            className="text-slate"
            style={{
              fontSize: 21,
              fontWeight: 300,
              lineHeight: 1.35,
              maxWidth: 520,
              textWrap: 'pretty',
            }}
          >
            No tienes ninguna póliza registrada para este vehículo. Añade una para llevar el control
            de la cobertura, el coste y la renovación.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="transition-opacity hover:opacity-85"
            style={{
              marginTop: 24,
              background: 'var(--color-ink)',
              color: 'var(--color-snow)',
              borderRadius: 999,
              border: 'none',
              padding: '12px 22px',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Añadir póliza →
          </button>
        </div>
        {showForm && <InsuranceForm onSubmit={handleSubmit} onClose={() => setShowForm(false)} />}
      </>
    );
  }

  /* ─── Cálculos de la póliza destacada ───────────────────────────────── */
  const start = parseISO(policy.start_date);
  const end = parseISO(policy.end_date);
  const today = new Date();

  const totalDays = Math.max(differenceInCalendarDays(end, start), 1);
  const rawDaysLeft = differenceInCalendarDays(end, today);
  const expired = rawDaysLeft <= 0;
  const daysLeft = Math.max(rawDaysLeft, 0);
  const pct = Math.min(Math.max(daysLeft / totalDays, 0), 1);

  const includedCount = INCLUDED_BY_TYPE[policy.coverage_type] ?? 0;
  const danosIncluded = includedCount >= 9;

  const freq = policy.payment_frequency ?? 'anual';
  const annual =
    policy.premium_amount != null ? policy.premium_amount * (FREQ_PER_YEAR[freq] ?? 1) : null;
  const monthly = annual != null ? annual / 12 : null;

  const coverageLabel = INSURANCE_COVERAGE_LABELS[policy.coverage_type] ?? policy.coverage_type;
  const documents = policy.document_url
    ? [{ label: 'Documento de la póliza', meta: 'Archivo adjunto', url: policy.document_url }]
    : [];

  const months = Array.from({ length: 13 }, (_, i) => MONTH_INITIALS[(start.getMonth() + i) % 12]);

  return (
    <>
      <div
        className="page-enter"
        style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: 26 }}
      >
        {/* ─── [1] Top strip ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center" style={{ gap: 14 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#1cb05c',
                boxShadow: '0 0 0 4px rgba(28,176,92,.18)',
                display: 'inline-block',
              }}
            />
            <span
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.18em' }}
            >
              {selectedVehicle.brand} {selectedVehicle.model}
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--color-silver-mist)' }} />
            <span
              className="font-mono uppercase text-ink"
              style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.14em' }}
            >
              {selectedVehicle.license_plate ?? '—'}
            </span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="transition-opacity hover:opacity-85"
            style={{
              background: 'var(--color-ink)',
              color: 'var(--color-snow)',
              borderRadius: 999,
              border: 'none',
              padding: '10px 18px',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ＋ Añadir póliza
          </button>
        </div>

        {/* ─── [2] Editorial + Hero card ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 items-end" style={{ gap: 48 }}>
          {/* 2a · Editorial */}
          <div>
            <span
              className="font-mono uppercase block"
              style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.18em', color: '#0066cc' }}
            >
              § Cobertura {expired ? 'vencida' : 'activa'}
            </span>
            <h1
              className="text-ink"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 'clamp(72px, 9vw, 132px)',
                lineHeight: 0.92,
                letterSpacing: '-3.2px',
                margin: '18px 0 14px',
              }}
            >
              Seguro.
            </h1>
            <p
              className="text-slate"
              style={{
                fontSize: 22,
                fontWeight: 300,
                lineHeight: 1.35,
                letterSpacing: '-0.2px',
                maxWidth: 520,
                textWrap: 'pretty',
              }}
            >
              {expired ? (
                <>
                  La póliza con{' '}
                  <span className="text-ink" style={{ fontWeight: 500 }}>
                    {policy.provider}
                  </span>{' '}
                  ha vencido. Renueva o añade una nueva para mantener la cobertura.
                </>
              ) : (
                <>
                  Una póliza vigente con{' '}
                  <span className="text-ink" style={{ fontWeight: 500 }}>
                    {policy.provider}
                  </span>
                  . Próxima renovación en{' '}
                  <span className="text-ink" style={{ fontWeight: 500 }}>
                    {daysLeft} días
                  </span>
                  .
                </>
              )}
            </p>
          </div>

          {/* 2b · Hero card */}
          <div
            className="bg-snow"
            style={{
              border: '1px solid var(--color-silver-mist)',
              borderRadius: 24,
              padding: '28px 30px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <ShieldWatermark
              size={320}
              stroke="var(--color-silver-mist)"
              style={{ right: -70, bottom: -80 }}
            />

            {/* Header */}
            <div className="flex items-center justify-between" style={{ position: 'relative' }}>
              <div className="flex items-center" style={{ gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'var(--color-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 2 L20 5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5 Z"
                      stroke="#fff"
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p
                    className="text-ink"
                    style={{
                      fontFamily: 'Inter, var(--font-sf-pro-display)',
                      fontWeight: 700,
                      fontSize: 24,
                      letterSpacing: '-0.4px',
                    }}
                  >
                    {policy.provider}
                  </p>
                  <p className="text-graphite" style={{ fontSize: 13, marginTop: 6 }}>
                    {coverageLabel}
                  </p>
                </div>
              </div>
              <span
                className="font-mono uppercase"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '.14em',
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: expired ? 'rgba(182,68,0,.10)' : 'rgba(28,176,92,.10)',
                  border: `1px solid ${expired ? 'rgba(182,68,0,.3)' : 'rgba(28,176,92,.3)'}`,
                  color: expired ? '#b64400' : '#0a7a3e',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: expired ? '#b64400' : '#1cb05c',
                    display: 'inline-block',
                  }}
                />
                {expired ? 'Vencida' : 'Vigente'}
              </span>
            </div>

            {/* Body */}
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: '1.05fr .95fr',
                gap: 24,
                marginTop: 26,
                position: 'relative',
              }}
            >
              {/* Columna izquierda */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <span
                    className="font-mono uppercase"
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '.14em',
                      color: 'var(--color-mist)',
                    }}
                  >
                    Prima
                  </span>
                  <p
                    className="text-ink"
                    style={{
                      fontFamily: 'Inter, var(--font-sf-pro-display)',
                      fontWeight: 700,
                      fontSize: 36,
                      letterSpacing: '-0.6px',
                      fontFeatureSettings: '"tnum"',
                      marginTop: 6,
                    }}
                  >
                    {annual != null ? `${formatCurrency(annual)}/año` : '—'}
                  </p>
                  {monthly != null && (
                    <p className="text-graphite" style={{ fontSize: 12, marginTop: 2 }}>
                      ≈ {formatCurrency(monthly)}/mes
                    </p>
                  )}
                </div>
                <div>
                  <span
                    className="font-mono uppercase"
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '.14em',
                      color: 'var(--color-mist)',
                    }}
                  >
                    Nº Póliza
                  </span>
                  <p
                    className="font-mono text-ink"
                    style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.04em', marginTop: 6 }}
                  >
                    {policy.policy_number ?? '—'}
                  </p>
                </div>
              </div>

              {/* Columna derecha · anillo de cuenta atrás */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg width={124} height={124} viewBox="0 0 120 120">
                  <circle
                    cx={60}
                    cy={60}
                    r={RING_R}
                    fill="none"
                    stroke="var(--color-silver-mist)"
                    strokeWidth={6}
                  />
                  <circle
                    cx={60}
                    cy={60}
                    r={RING_R}
                    fill="none"
                    stroke={expired ? '#b64400' : 'var(--color-ink)'}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={expired ? `${RING_C} ${RING_C}` : `${RING_C * pct} ${RING_C}`}
                    transform="rotate(-90 60 60)"
                  />
                  <text
                    x={60}
                    y={56}
                    textAnchor="middle"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: 28,
                      letterSpacing: '-0.6px',
                      fill: 'var(--color-ink)',
                    }}
                  >
                    {daysLeft}
                  </text>
                  <text
                    x={60}
                    y={74}
                    textAnchor="middle"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '2px',
                      fill: 'var(--color-graphite)',
                    }}
                  >
                    DÍAS
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ─── [3] Timeline strip ────────────────────────────────────── */}
        <div
          className="bg-snow"
          style={{
            border: '1px solid var(--color-silver-mist)',
            borderRadius: 20,
            padding: '20px 28px',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div className="flex items-center" style={{ gap: 12 }}>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '.18em',
                  color: 'var(--color-mist)',
                }}
              >
                § Vigencia
              </span>
              <span style={{ width: 1, height: 14, background: 'var(--color-silver-mist)' }} />
              <span className="text-ink" style={{ fontSize: 13, fontWeight: 500 }}>
                {expired ? 'Póliza vencida' : `${daysLeft} días por delante · sin reclamaciones`}
              </span>
            </div>
            <div className="flex items-baseline" style={{ gap: 8 }}>
              <span className="font-mono text-graphite" style={{ fontSize: 11 }}>
                HOY
              </span>
              <span className="font-mono text-ink" style={{ fontSize: 11 }}>
                {dotDate(today)}
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', height: 62, marginTop: 18 }}>
            {/* Labels */}
            <div style={{ position: 'absolute', left: 0, top: -4 }}>
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  display: 'block',
                }}
              >
                INICIO
              </span>
              <span className="font-mono text-graphite" style={{ fontSize: 10, fontWeight: 500 }}>
                {dotDate(start)}
              </span>
            </div>
            <div style={{ position: 'absolute', right: 0, top: -4, textAlign: 'right' }}>
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  display: 'block',
                }}
              >
                VENCE
              </span>
              <span className="font-mono text-graphite" style={{ fontSize: 10, fontWeight: 500 }}>
                {dotDate(end)}
              </span>
            </div>

            {/* Barra de fondo */}
            <div
              style={{
                position: 'absolute',
                top: 30,
                left: 0,
                right: 0,
                height: 14,
                background: 'var(--color-fog)',
                borderRadius: 999,
              }}
            />
            {/* Progreso */}
            <div
              style={{
                position: 'absolute',
                top: 30,
                left: 0,
                width: `${pct * 100}%`,
                height: 14,
                background: 'var(--color-ink)',
                borderRadius: 999,
              }}
            />
            {/* Marcador inicio */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 30,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: 'var(--color-ink)',
                border: '2px solid var(--color-snow)',
                boxShadow: '0 0 0 2px var(--color-ink)',
              }}
            />
            {/* Marcador fin */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 30,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: 'var(--color-snow)',
                border: '2px solid var(--color-ink)',
              }}
            />
            {/* Escala de meses */}
            <div
              className="flex justify-between"
              style={{ position: 'absolute', top: 50, left: 0, right: 0 }}
            >
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                >
                  <span style={{ width: 1, height: 6, background: 'var(--color-silver-mist)' }} />
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '.12em',
                      color: 'var(--color-mist)',
                    }}
                  >
                    {m}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── [4] Bloque inferior ───────────────────────────────────── */}
        <div className="grid lg:grid-cols-[260px_1fr_360px]" style={{ gap: 48 }}>
          {/* 4a · Editorial coberturas */}
          <div>
            <span
              className="font-mono uppercase block"
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '.18em',
                color: 'var(--color-mist)',
              }}
            >
              § Coberturas
            </span>
            <h2
              className="text-ink"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 40,
                letterSpacing: '-0.7px',
                margin: '14px 0 12px',
              }}
            >
              Qué cubre.
            </h2>
            <p
              className="text-graphite"
              style={{ fontSize: 14, lineHeight: 1.5, textWrap: 'pretty' }}
            >
              Detalle según el condicionado particular.{' '}
              <span className="text-ink" style={{ fontWeight: 500 }}>
                {includedCount} de 10 coberturas
              </span>{' '}
              incluidas.{' '}
              {danosIncluded
                ? 'Los daños propios están cubiertos en este nivel.'
                : 'Los daños propios no están en este nivel.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setEditing(policy)}
                className="transition-opacity hover:opacity-85"
                style={{
                  background: 'var(--color-ink)',
                  color: 'var(--color-snow)',
                  borderRadius: 999,
                  border: 'none',
                  padding: '10px 16px',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Ver póliza completa →
              </button>
              {policy.coverage_type !== 'todo_riesgo' &&
                policy.coverage_type !== 'todo_riesgo_franquicia' && (
                  <button
                    onClick={() => setEditing(policy)}
                    className="bg-snow text-ink transition-colors hover:bg-fog"
                    style={{
                      border: '1px solid var(--color-silver-mist)',
                      borderRadius: 999,
                      padding: '9px 16px',
                      fontWeight: 500,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Subir mejora a Todo Riesgo
                  </button>
                )}
              <button
                onClick={() => handleDelete(policy.id)}
                className="bg-snow transition-opacity hover:opacity-75"
                style={{
                  border: '1px solid rgba(182, 68, 0, 0.35)',
                  borderRadius: 999,
                  padding: '9px 16px',
                  fontWeight: 500,
                  fontSize: 13,
                  color: 'var(--color-accent-500, #b64400)',
                  cursor: 'pointer',
                }}
              >
                Eliminar póliza
              </button>
            </div>
          </div>

          {/* 4b · Grid de coberturas */}
          <div className="grid sm:grid-cols-2" style={{ columnGap: 36, alignContent: 'start' }}>
            {COVERAGE_CATALOG.map((c, i) => {
              const included = i < includedCount;
              return (
                <div
                  key={c.label}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: '22px 1fr auto',
                    gap: 12,
                    padding: '13px 0',
                    borderTop: '1px solid var(--color-silver-mist)',
                  }}
                >
                  {included ? (
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        background: 'var(--color-ink)',
                        color: 'var(--color-snow)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width={10} height={10} viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path
                          d="M2 6.5l2.5 2.5L10 3.5"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  ) : (
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: '1px solid var(--color-silver-mist)',
                        color: 'var(--color-mist)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                    >
                      −
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 15,
                      letterSpacing: '-0.05px',
                      color: included ? 'var(--color-ink)' : 'var(--color-mist)',
                    }}
                  >
                    {c.label}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '.06em',
                      color: included ? 'var(--color-graphite)' : 'var(--color-silver-mist)',
                    }}
                  >
                    {included ? c.meta : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 4c · Lateral derecho */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* CTA renovación */}
            <div
              style={{
                background: '#1d1d1f',
                color: '#fff',
                borderRadius: 20,
                padding: '22px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <ShieldWatermark
                size={220}
                stroke="rgba(255,255,255,.06)"
                style={{ right: -40, top: -40 }}
              />
              <div style={{ position: 'relative' }}>
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '.18em',
                    color: 'rgba(255,255,255,.6)',
                  }}
                >
                  Recordatorio
                </span>
                <p
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700,
                    fontSize: 24,
                    letterSpacing: '-0.4px',
                    lineHeight: 1.15,
                    marginTop: 10,
                  }}
                >
                  Comparamos antes de renovar.
                </p>
                <p
                  style={{
                    fontWeight: 300,
                    fontSize: 14,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,.7)',
                    marginTop: 10,
                    textWrap: 'pretty',
                  }}
                >
                  Te avisaremos 30 días antes con propuestas equivalentes en cobertura.
                </p>
                <button
                  onClick={() => {
                    setAlertOn((v) => !v);
                    toast.success(alertOn ? 'Alerta desactivada' : 'Alerta de renovación activada');
                  }}
                  className="transition-opacity hover:opacity-85"
                  style={{
                    background: '#fff',
                    color: '#1d1d1f',
                    borderRadius: 999,
                    border: 'none',
                    padding: '9px 16px',
                    fontWeight: 500,
                    fontSize: 13,
                    marginTop: 16,
                    cursor: 'pointer',
                  }}
                >
                  {alertOn ? 'Alerta activada ✓' : 'Activar alerta'}
                </button>
              </div>
            </div>

            {/* Documentos */}
            <div
              className="bg-snow"
              style={{
                border: '1px solid var(--color-silver-mist)',
                borderRadius: 20,
                padding: '18px 22px',
              }}
            >
              <span
                className="font-mono uppercase block"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '.18em',
                  color: 'var(--color-mist)',
                }}
              >
                § Documentos
              </span>
              {documents.length === 0 ? (
                <p className="text-graphite" style={{ fontSize: 13, marginTop: 12 }}>
                  Aún no hay documentos adjuntos a esta póliza.
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.label}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: '20px 1fr auto',
                      gap: 10,
                      padding: '10px 0',
                      borderTop: '1px solid var(--color-silver-mist)',
                      marginTop: 8,
                    }}
                  >
                    <FileText
                      className="text-graphite"
                      style={{ width: 20, height: 20 }}
                      strokeWidth={1.6}
                    />
                    <div>
                      <p className="text-ink" style={{ fontSize: 13, fontWeight: 500 }}>
                        {doc.label}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-mist)', marginTop: 4 }}>
                        {doc.meta}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, fontWeight: 500, color: '#0066cc' }}
                    >
                      ↓
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {(showForm || editing) && (
        <InsuranceForm
          initialData={editing ? toInput(editing) : undefined}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
};
