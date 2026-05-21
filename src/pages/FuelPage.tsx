import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Fuel, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { fuelService } from '../services/fuel.service';
import type { FuelLog, CreateFuelLogInput } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

const FUEL_TYPES_STATIONS = ['Repsol', 'BP', 'Cepsa', 'Shell', 'Galp', 'Petronor', 'Otro'];

const defaultForm = (): CreateFuelLogInput => ({
  date: new Date().toISOString().split('T')[0],
  km_at_fillup: 0,
  liters: 0,
  price_per_liter: 1.5,
  station: '',
  full_tank: true,
  notes: '',
});

export const FuelPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFuelLogInput>(defaultForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    setLoading(true);
    fuelService.getByVehicle(selectedVehicle.id)
      .then(setLogs)
      .catch(() => toast.error('Error al cargar repostajes'))
      .finally(() => setLoading(false));
  }, [selectedVehicle?.id]);

  if (!selectedVehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.km_at_fillup <= 0) { toast.error('Introduce los km al repostar'); return; }
    if (form.liters <= 0) { toast.error('Introduce los litros'); return; }
    setSaving(true);
    try {
      const log = await fuelService.create(selectedVehicle.id, user.id, form);
      setLogs((prev) => [log, ...prev].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() || b.km_at_fillup - a.km_at_fillup
      ));
      toast.success('Repostaje añadido');
      setShowForm(false);
      setForm(defaultForm());
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este repostaje?')) return;
    const snapshot = logs;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await fuelService.delete(id);
      toast.success('Repostaje eliminado');
    } catch {
      setLogs(snapshot);
      toast.error('Error al eliminar');
    }
  };

  // Calculate L/100km for each fill-up (needs previous km to compute distance)
  const logsWithConsumption = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.km_at_fillup - b.km_at_fillup);
    return sorted.map((log, idx) => {
      const prev = sorted[idx - 1];
      if (!prev || !log.full_tank) return { ...log, lper100: null };
      const km = log.km_at_fillup - prev.km_at_fillup;
      if (km <= 0 || km > 2000) return { ...log, lper100: null };
      const lper100 = (log.liters / km) * 100;
      return { ...log, lper100: Math.round(lper100 * 10) / 10 };
    }).reverse();
  }, [logs]);

  const avgConsumption = useMemo(() => {
    const valid = logsWithConsumption.filter((l) => l.lper100 !== null);
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((s, l) => s + l.lper100!, 0) / valid.length) * 10) / 10;
  }, [logsWithConsumption]);

  const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost = logs.reduce((s, l) => s + l.total_cost, 0);
  const avgPricePerLiter = logs.length > 0
    ? Math.round((logs.reduce((s, l) => s + l.price_per_liter, 0) / logs.length) * 1000) / 1000
    : 0;

  const chartData = logsWithConsumption
    .filter((l) => l.lper100 !== null)
    .slice(0, 20)
    .reverse()
    .map((l) => ({
      date: formatDate(l.date),
      consumo: l.lper100,
      km: l.km_at_fillup,
    }));

  return (
    <div style={{ padding: '20px 12px 80px', maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        @media (min-width: 640px) {
          .fuel-page-container { padding: 28px 20px 80px; }
        }
        @media (min-width: 768px) {
          .fuel-page-container { padding: 32px 24px 80px; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-graphite)', textTransform: 'uppercase', marginBottom: 6 }}>
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <h1 style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(24px, 5vw, 48px)', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0, color: 'var(--color-ink)' }}>
            Combustible
          </h1>
        </div>
        <Button onClick={() => setShowForm(true)} style={{ minHeight: 40, minWidth: 40, fontSize: '12px', padding: '8px 12px' }}>
          <Plus size={14} /> Añadir
        </Button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Consumo', value: avgConsumption ? `${avgConsumption} L/100` : '—', sub: 'medio' },
          { label: 'Litros', value: `${Math.round(totalLiters * 10) / 10} L`, sub: `${logs.length}` },
          { label: 'Gasto', value: formatCurrency(totalCost), sub: 'total' },
          { label: 'Precio', value: avgPricePerLiter ? `${avgPricePerLiter} €/L` : '—', sub: 'medio' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-graphite)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(16px, 3.5vw, 24px)', letterSpacing: '-0.3px', color: 'var(--color-ink)' }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-mist)', marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length >= 2 && (
        <div style={{ background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)', borderRadius: 16, padding: '16px 14px', marginBottom: 28 }}>
          <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-graphite)', marginBottom: 12 }}>
            Tendencia de consumo L/100 km
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver-mist)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} unit=" L" />
              <Tooltip formatter={(v) => [`${v} L/100km`, 'Consumo']} />
              <Line type="monotone" dataKey="consumo" stroke="#0071e3" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)', borderRadius: 16, padding: '16px 14px', marginBottom: 28 }}>
          <h2 style={{ fontWeight: 700, fontSize: 'clamp(14px, 4vw, 18px)', margin: '0 0 16px', color: 'var(--color-ink)' }}>Nuevo repostaje</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[
                { label: 'Fecha', type: 'date', key: 'date' as const, required: true },
                { label: 'KM', type: 'number', key: 'km_at_fillup' as const, required: true },
                { label: 'Litros', type: 'number', key: 'liters' as const, required: true },
                { label: '€/L', type: 'number', key: 'price_per_liter' as const, required: true },
              ].map(({ label, type, key, required }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-graphite)', marginBottom: 4 }}>{label}</label>
                  <input
                    type={type}
                    required={required}
                    step={type === 'number' ? '0.001' : undefined}
                    value={form[key] as string | number}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-silver-mist)', background: 'var(--color-fog)', fontSize: '14px', minHeight: 40, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-graphite)', marginBottom: 4 }}>Gasolinera</label>
                <select
                  value={form.station ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, station: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-silver-mist)', background: 'var(--color-fog)', fontSize: '14px', minHeight: 40, boxSizing: 'border-box' }}
                >
                  <option value="">Sin especificar</option>
                  {FUEL_TYPES_STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="full_tank"
                  checked={form.full_tank ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, full_tank: e.target.checked }))}
                  style={{ width: 20, height: 20, minWidth: 20, cursor: 'pointer' }}
                />
                <label htmlFor="full_tank" style={{ fontSize: '13px', color: 'var(--color-ink)', userSelect: 'none', cursor: 'pointer' }}>
                  Lleno
                </label>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-graphite)', marginBottom: 4 }}>Notas</label>
              <textarea
                rows={2}
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-silver-mist)', background: 'var(--color-fog)', fontSize: '14px', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Button type="submit" disabled={saving} style={{ minHeight: 40, minWidth: 40, fontSize: '12px', padding: '8px 12px' }}>{saving ? 'Guardando…' : 'Guardar'}</Button>
              <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm()); }} style={{ padding: '10px 12px', minHeight: 40, borderRadius: 8, border: '1px solid var(--color-silver-mist)', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : logsWithConsumption.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="Sin repostajes registrados"
          description="Registra cada repostaje para calcular el consumo real de tu vehículo."
          action={<Button onClick={() => setShowForm(true)}>Añadir primer repostaje</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {logsWithConsumption.map((log) => {
            const isGood = log.lper100 !== null && log.lper100 < (avgConsumption ?? Infinity);
            return (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 12, background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)', transition: 'background 150ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-fog)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Fuel size={14} color="var(--color-graphite)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 'clamp(13px, 2.5vw, 15px)', color: 'var(--color-ink)' }}>
                      {log.liters} L · {formatCurrency(log.total_cost)}
                    </span>
                    {log.lper100 !== null && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 6px', borderRadius: 999, background: isGood ? '#e8f5e9' : '#fff3e0', color: isGood ? '#2f6b34' : '#c77700' }}>
                        {isGood ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                        {log.lper100} L/100
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-mist)', marginTop: 2 }}>
                    {formatDate(log.date)} · {log.km_at_fillup.toLocaleString('es-ES')} km
                    {log.station ? ` · ${log.station}` : ''}
                    {log.price_per_liter ? ` · ${log.price_per_liter} €/L` : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  style={{ padding: 8, minHeight: 40, minWidth: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-mist)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Eliminar repostaje"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
