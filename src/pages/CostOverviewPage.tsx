import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Info } from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { expensesService } from '../services/expenses.service';
import { maintenanceService } from '../services/maintenance.service';
import { insuranceService } from '../services/insurance.service';
import { prestamoService } from '../services/prestamo.service';
import {
  costOverviewService,
  type CostPeriod,
  type CostOverview,
} from '../services/costOverview.service';
import { CostDonut } from '../components/cost/CostDonut';
import { SkeletonRow } from '../components/ui/Skeleton';
import type { Expense, MaintenanceRecord, InsurancePolicy, PrestamoMovimiento } from '../types';
import { formatCurrency, formatKm } from '../utils/formatters';
import { cn } from '../utils/cn';

const PERIODS: { key: CostPeriod; label: string }[] = [
  { key: 'historico', label: 'Histórico' },
  { key: '12meses', label: '12 meses' },
  { key: 'anio', label: 'Año actual' },
];

interface CostData {
  expenses: Expense[];
  maintenance: MaintenanceRecord[];
  insurance: InsurancePolicy[];
  prestamo: PrestamoMovimiento[];
}

const EMPTY: CostData = { expenses: [], maintenance: [], insurance: [], prestamo: [] };

const fmtMonthValue = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));

export const CostOverviewPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const navigate = useNavigate();

  const [data, setData] = useState<CostData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<CostPeriod>('historico');

  useEffect(() => {
    if (!selectedVehicle) {
      navigate('/dashboard');
      return;
    }
    const id = selectedVehicle.id;
    setLoading(true);
    Promise.all([
      expensesService.getByVehicle(id).catch(() => [] as Expense[]),
      maintenanceService.getByVehicle(id).catch(() => [] as MaintenanceRecord[]),
      insuranceService.getByVehicle(id).catch(() => [] as InsurancePolicy[]),
      prestamoService.getByVehicle(id).catch(() => [] as PrestamoMovimiento[]),
    ])
      .then(([expenses, maintenance, insurance, prestamo]) =>
        setData({ expenses, maintenance, insurance, prestamo }),
      )
      .finally(() => setLoading(false));
  }, [selectedVehicle?.id]);

  const overview: CostOverview = useMemo(
    () =>
      costOverviewService.compute({ ...data, currentKm: selectedVehicle?.current_km ?? 0 }, period),
    [data, period, selectedVehicle?.current_km],
  );

  if (!selectedVehicle) return null;

  const { total, slices, monthly, costPerKm, avgPerMonth, pendingLoan, topSlice, maxMonth } =
    overview;

  return (
    <div className="px-6 sm:px-10 py-10">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-end justify-between mb-9 gap-6 flex-wrap">
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
            Coste total.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            Financiación, mantenimiento, seguro y gastos de uso, en una sola vista.
          </p>
        </div>
        <div className="flex bg-fog rounded-full p-1 gap-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-4 h-8 rounded-full font-text font-medium transition-colors text-sm',
                period === p.key ? 'bg-snow text-ink' : 'text-graphite hover:text-ink',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : total === 0 ? (
        <div className="bg-snow border border-silver-mist rounded-[28px] px-6 py-16 text-center">
          <p className="font-display text-ink" style={{ fontWeight: 600, fontSize: 20 }}>
            Aún no hay costes registrados
          </p>
          <p
            className="font-text text-graphite mt-2 max-w-md mx-auto"
            style={{ fontSize: 15, lineHeight: 1.5 }}
          >
            Cuando registres gastos, mantenimiento, seguro o pagos del préstamo, esta vista los
            sumará automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Hero ─────────────────────────────────────────────── */}
          <div
            className="rounded-[28px] p-8 grid gap-7"
            style={{
              background: 'var(--color-ink)',
              gridTemplateColumns: 'minmax(0, 1.2fr) auto',
            }}
          >
            <div>
              <span
                className="font-mono uppercase"
                style={{ fontSize: 11, letterSpacing: '0.14em', color: 'rgba(255,255,255,.55)' }}
              >
                {period === 'historico'
                  ? 'Coste total acumulado'
                  : period === '12meses'
                    ? 'Coste · últimos 12 meses'
                    : 'Coste · año actual'}
              </span>
              <p
                className="font-display tabular-nums"
                style={{
                  fontWeight: 700,
                  fontSize: 'clamp(40px, 7vw, 54px)',
                  letterSpacing: '-1.5px',
                  lineHeight: 1,
                  marginTop: 10,
                  color: '#fff',
                }}
              >
                {formatCurrency(total)}
              </p>
              <div className="flex gap-7 mt-6 flex-wrap">
                {costPerKm != null && (
                  <HeroStat label="Coste / km" value={formatCurrency(costPerKm)} />
                )}
                <HeroStat label="Media / mes" value={formatCurrency(avgPerMonth)} />
                {pendingLoan > 0 && (
                  <HeroStat label="Pendiente préstamo" value={formatCurrency(pendingLoan)} />
                )}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <CostDonut
                segments={slices.map((s) => ({ color: s.color, pct: s.pct }))}
                centerLabel="Mayor partida"
                centerValue={topSlice?.label ?? '—'}
                centerSub={topSlice ? `${Math.round(topSlice.pct)}%` : undefined}
              />
            </div>
          </div>

          {/* ── Tira de partidas ─────────────────────────────────── */}
          <div
            className="grid gap-px rounded-[18px] overflow-hidden"
            style={{
              background: 'var(--color-silver-mist)',
              gridTemplateColumns: `repeat(${Math.min(slices.length, 4)}, minmax(0, 1fr))`,
            }}
          >
            {slices.map((s) => (
              <div key={s.key} className="bg-snow" style={{ padding: '18px 18px 20px' }}>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full"
                    style={{ width: 7, height: 7, background: s.color }}
                  />
                  <span
                    className="font-mono uppercase text-graphite truncate"
                    style={{ fontSize: 9, letterSpacing: '0.1em' }}
                  >
                    {s.label}
                  </span>
                </div>
                <p
                  className="font-display text-ink tabular-nums"
                  style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.4px', marginTop: 10 }}
                >
                  {formatCurrency(s.amount)}
                </p>
                <p className="font-text text-graphite" style={{ fontSize: 12, marginTop: 3 }}>
                  {Math.round(s.pct)}% · {s.detail}
                </p>
              </div>
            ))}
          </div>

          {/* ── Dos columnas: desglose + mensual ─────────────────── */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Desglose por partida */}
            <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
              <p
                className="font-mono uppercase text-graphite"
                style={{ fontSize: 11, letterSpacing: '0.14em', marginBottom: 20 }}
              >
                Desglose por partida
              </p>
              <div className="space-y-4">
                {slices.map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span
                        className="font-text text-ink"
                        style={{ fontSize: 13, fontWeight: 500 }}
                      >
                        {s.label}
                      </span>
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-graphite" style={{ fontSize: 11 }}>
                          {Math.round(s.pct)}%
                        </span>
                        <span
                          className="font-display text-ink tabular-nums"
                          style={{ fontSize: 15, fontWeight: 600 }}
                        >
                          {formatCurrency(s.amount)}
                        </span>
                      </span>
                    </div>
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ height: 6, background: 'var(--color-silver-mist)' }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${topSlice && topSlice.amount > 0 ? (s.amount / topSlice.amount) * 100 : 0}%`,
                          background: s.color,
                          borderRadius: 999,
                          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="flex gap-2.5 rounded-[14px] mt-6"
                style={{ background: 'var(--color-fog)', padding: '12px 16px' }}
              >
                <Info className="h-4 w-4 text-graphite shrink-0 mt-0.5" strokeWidth={1.7} />
                <p className="font-text text-slate" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  El <b className="text-ink">mantenimiento</b> y el{' '}
                  <b className="text-ink">seguro</b> se toman de sus módulos; los gastos de esas
                  categorías se excluyen para no contar doble. El seguro se prorratea por días de
                  cobertura.
                </p>
              </div>
            </section>

            {/* Coste mensual */}
            <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
              <p
                className="font-mono uppercase text-graphite"
                style={{ fontSize: 11, letterSpacing: '0.14em', marginBottom: 20 }}
              >
                Coste mensual · últimos 12 meses
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={monthly}
                  barSize={16}
                  margin={{ top: 4, right: 0, left: -24, bottom: 0 }}
                >
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
                    tickFormatter={fmtMonthValue}
                  />
                  <Tooltip
                    formatter={(val) => [formatCurrency(Number(val)), 'Coste']}
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
                  <Bar dataKey="total" radius={[5, 5, 2, 2]}>
                    {monthly.map((m, i) => (
                      <Cell key={i} fill={m.total > 0 ? '#0071e3' : 'var(--color-silver-mist)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div
                className="grid grid-cols-2 gap-px rounded-[16px] overflow-hidden mt-5"
                style={{ background: 'var(--color-silver-mist)' }}
              >
                <div className="bg-snow" style={{ padding: '16px 18px' }}>
                  <p
                    className="font-mono uppercase text-graphite"
                    style={{ fontSize: 9, letterSpacing: '0.1em' }}
                  >
                    Mes más caro
                  </p>
                  <p
                    className="font-display text-ink tabular-nums"
                    style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}
                  >
                    {maxMonth ? formatCurrency(maxMonth.total) : '—'}
                  </p>
                  <p className="font-text text-graphite" style={{ fontSize: 12, marginTop: 2 }}>
                    {maxMonth ? maxMonth.label : 'sin datos'}
                  </p>
                </div>
                <div className="bg-snow" style={{ padding: '16px 18px' }}>
                  <p
                    className="font-mono uppercase text-graphite"
                    style={{ fontSize: 9, letterSpacing: '0.1em' }}
                  >
                    Odómetro
                  </p>
                  <p
                    className="font-display text-ink tabular-nums"
                    style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}
                  >
                    {formatKm(selectedVehicle.current_km)}
                  </p>
                  <p className="font-text text-graphite" style={{ fontSize: 12, marginTop: 2 }}>
                    {costPerKm != null
                      ? `${formatCurrency(costPerKm)} / km`
                      : 'coste/km en histórico'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

const HeroStat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p
      className="font-mono uppercase"
      style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,.5)' }}
    >
      {label}
    </p>
    <p
      className="font-display tabular-nums"
      style={{
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: '-0.4px',
        marginTop: 5,
        color: '#fff',
      }}
    >
      {value}
    </p>
  </div>
);
