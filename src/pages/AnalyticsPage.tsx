import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useVehicleStore } from '../store/vehicleStore';
import { maintenanceService } from '../services/maintenance.service';
import { expensesService } from '../services/expenses.service';
import { tripsService } from '../services/trips.service';
import type { MaintenanceRecord, Expense, Trip } from '../types';
import { SkeletonRow } from '../components/ui/Skeleton';
import { formatCurrency } from '../utils/formatters';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const COLORS = ['#0071e3', '#1cb05c', '#c77700', '#7b4de0', '#b64400', '#00c4ff', '#ff6b6b', '#4ecdc4'];

type ViewMode = 'gastos' | 'km' | 'servicios';

export const AnalyticsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const navigate = useNavigate();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>('gastos');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    setLoading(true);
    Promise.all([
      maintenanceService.getByVehicle(selectedVehicle.id).catch(() => [] as MaintenanceRecord[]),
      expensesService.getByVehicle(selectedVehicle.id).catch(() => [] as Expense[]),
      tripsService.getByVehicle(selectedVehicle.id).catch(() => [] as Trip[]),
    ]).then(([rec, exp, trp]) => {
      setRecords(rec);
      setExpenses(exp);
      setTrips(trp);
    }).finally(() => setLoading(false));
  }, [selectedVehicle?.id]);

  if (!selectedVehicle) return null;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    [...records, ...expenses].forEach((item) => {
      const d = 'date' in item ? item.date : (item as Expense).date;
      years.add(new Date(d).getFullYear());
    });
    const arr = Array.from(years).sort((a, b) => b - a);
    if (arr.length === 0) arr.push(new Date().getFullYear());
    return arr;
  }, [records, expenses]);

  // Monthly expense data (expenses + maintenance costs)
  const monthlyExpenses = useMemo(() => {
    return MONTHS_ES.map((month, idx) => {
      const expTotal = expenses
        .filter((e) => new Date(e.date).getFullYear() === yearFilter && new Date(e.date).getMonth() === idx)
        .reduce((s, e) => s + e.amount, 0);
      const mntTotal = records
        .filter((r) => new Date(r.date).getFullYear() === yearFilter && new Date(r.date).getMonth() === idx)
        .reduce((s, r) => s + (r.cost ?? 0), 0);
      return { month, gastos: Math.round(expTotal), mantenimiento: Math.round(mntTotal), total: Math.round(expTotal + mntTotal) };
    });
  }, [expenses, records, yearFilter]);

  // Monthly km from trips
  const monthlyKm = useMemo(() => {
    return MONTHS_ES.map((month, idx) => ({
      month,
      km: Math.round(
        trips
          .filter((t) => new Date(t.start_datetime).getFullYear() === yearFilter && new Date(t.start_datetime).getMonth() === idx)
          .reduce((s, t) => s + (t.total_km ?? 0), 0)
      ),
    }));
  }, [trips, yearFilter]);

  // Monthly service count
  const monthlyServices = useMemo(() => {
    return MONTHS_ES.map((month, idx) => ({
      month,
      servicios: records.filter((r) => new Date(r.date).getFullYear() === yearFilter && new Date(r.date).getMonth() === idx).length,
    }));
  }, [records, yearFilter]);

  // Cost by type (maintenance)
  const costByType = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      if (r.cost) map[r.type] = (map[r.type] ?? 0) + r.cost;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [records]);

  // KPIs
  const totalExpYtd = monthlyExpenses.reduce((s, m) => s + m.total, 0);
  const totalKmYtd = monthlyKm.reduce((s, m) => s + m.km, 0);
  const totalServicesYtd = monthlyServices.reduce((s, m) => s + m.servicios, 0);
  const costPerKm = totalKmYtd > 0 ? Math.round((totalExpYtd / totalKmYtd) * 100) / 100 : 0;
  const avgMonthlyExp = Math.round(monthlyExpenses.filter((m) => m.total > 0).reduce((s, m) => s + m.total, 0) / Math.max(1, monthlyExpenses.filter((m) => m.total > 0).length));

  return (
    <div style={{ padding: '20px 12px 80px', maxWidth: 960, margin: '0 auto' }}>
      <style>{`
        @media (min-width: 640px) {
          .analytics-container { padding: 28px 20px 80px; }
        }
        @media (min-width: 768px) {
          .analytics-container { padding: 32px 24px 80px; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-graphite)', textTransform: 'uppercase', marginBottom: 6 }}>
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <h1 style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(24px, 5vw, 48px)', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0, color: 'var(--color-ink)' }}>
            Análisis
          </h1>
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-silver-mist)', background: 'var(--color-snow)', fontSize: '12px', fontWeight: 600, minHeight: 40 }}
        >
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
            {[
              { label: 'Gasto', value: formatCurrency(totalExpYtd), sub: String(yearFilter) },
              { label: 'Km', value: `${totalKmYtd.toLocaleString('es-ES')}`, sub: 'viajes' },
              { label: 'Coste/km', value: costPerKm ? `${costPerKm}` : '—', sub: '€/km' },
              { label: 'Gasto mes', value: avgMonthlyExp ? formatCurrency(avgMonthlyExp) : '—', sub: 'media' },
              { label: 'Servicios', value: String(totalServicesYtd), sub: yearFilter },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)', borderRadius: 14, padding: '12px 12px' }}>
                <div style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-graphite)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(14px, 3vw, 22px)', letterSpacing: '-0.2px', color: 'var(--color-ink)' }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-mist)', marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* View selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {([
              { key: 'gastos', label: 'Gastos' },
              { key: 'km', label: 'Km' },
              { key: 'servicios', label: 'Servicios' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{
                  padding: '6px 12px', borderRadius: 999, border: '1px solid var(--color-silver-mist)',
                  background: view === key ? 'var(--color-ink)' : 'transparent',
                  color: view === key ? '#fff' : 'var(--color-graphite)',
                  fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s', minHeight: 32,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Main chart */}
          <div style={{ background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)', borderRadius: 16, padding: '16px 12px', marginBottom: 28 }}>
            {view === 'gastos' && (
              <>
                <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-graphite)', margin: '0 0 14px 6px' }}>
                  Gastos por mes — {yearFilter}
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyExpenses}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver-mist)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
                    <Legend />
                    <Bar dataKey="gastos" name="Gastos" fill="#0071e3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mantenimiento" name="Mantenimiento" fill="#7b4de0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
            {view === 'km' && (
              <>
                <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-graphite)', margin: '0 0 14px 6px' }}>
                  Kilómetros por mes — {yearFilter}
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyKm}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver-mist)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${Number(v).toLocaleString('es-ES')} km`, 'Kilómetros']} />
                    <Line type="monotone" dataKey="km" stroke="#1cb05c" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
            {view === 'servicios' && (
              <>
                <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-graphite)', margin: '0 0 14px 6px' }}>
                  Servicios por mes — {yearFilter}
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyServices}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver-mist)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [v, 'Servicios']} />
                    <Bar dataKey="servicios" name="Servicios" fill="#c77700" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Cost by type pie */}
          {costByType.length > 0 && (
            <div style={{ background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)', borderRadius: 16, padding: '16px 12px' }}>
              <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-graphite)', margin: '0 0 16px' }}>
                Gasto por tipo de servicio
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, alignItems: 'flex-start' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={costByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                      {costByType.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {costByType.map(({ name, value }, idx) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', flex: 1, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-graphite)', flexShrink: 0 }}>{formatCurrency(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
