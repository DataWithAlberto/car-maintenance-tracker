import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { maintenanceService } from '../services/maintenance.service';
import { expensesService } from '../services/expenses.service';
import { tripsService } from '../services/trips.service';
import { calculateAlerts } from '../utils/calculations';
import { OIL_CHANGE_KM_INTERVAL } from '../utils/constants';
import type {
  VehicleWithAccess, MaintenanceRecord, Expense, Trip, Alert,
} from '../types';
import toast from 'react-hot-toast';

// ─── Locale-safe formatting (es-ES with space thousands separator) ──────────
const fmtN = (n: number) =>
  Math.round(n).toLocaleString('es-ES').replace(/\./g, ' ');
const fmtEur = (n: number) => `${fmtN(n)} €`;
const fmtMonthDay = (d: Date) =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    .replace('.', '').toUpperCase();

interface VehicleStats {
  vehicle: VehicleWithAccess;
  records: MaintenanceRecord[];
  expenses: Expense[];
  trips: Trip[];
  alerts: Alert[];
}

export const DashboardPage = () => {
  const { vehicles, loading, fetchVehicles, createVehicle } = useVehicle();
  const { setSelectedVehicle: storeSet } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<Record<string, VehicleStats>>({});
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  useEffect(() => {
    if (vehicles.length === 0) return;
    Promise.all(
      vehicles.map(async (v) => {
        const [records, expenses, trips] = await Promise.all([
          maintenanceService.getByVehicle(v.id).catch(() => []),
          expensesService.getByVehicle(v.id).catch(() => []),
          tripsService.getByVehicle(v.id).catch(() => []),
        ]);
        return {
          id: v.id,
          data: {
            vehicle: v,
            records,
            expenses,
            trips,
            alerts: calculateAlerts(v, records).filter((a) => !a.is_dismissed),
          } satisfies VehicleStats,
        };
      }),
    ).then((results) => {
      const map: Record<string, VehicleStats> = {};
      results.forEach((r) => { map[r.id] = r.data; });
      setStats(map);
      setLoadedAt(new Date());
    });
  }, [vehicles]);

  // Primary vehicle = first owned, else first available
  const primary = useMemo(
    () => vehicles.find((v) => v.role === 'owner') ?? vehicles[0] ?? null,
    [vehicles],
  );
  const primaryStats = primary ? stats[primary.id] : undefined;

  // ─── Aggregates (fleet-wide) ──────────────────────────────────────────────
  const aggregate = useMemo(() => {
    const ids = new Set(vehicles.map((v) => v.id));
    const all = Object.entries(stats)
      .filter(([id]) => ids.has(id))
      .map(([, s]) => s);
    const ytd = new Date().getFullYear();
    const totalKm = vehicles.reduce((s, v) => s + v.current_km, 0);
    const totalRecords = all.reduce((s, x) => s + x.records.length, 0);
    const totalSpentYtd = all.reduce(
      (s, x) =>
        s
        + x.expenses
            .filter((e) => new Date(e.date).getFullYear() === ytd)
            .reduce((a, e) => a + e.amount, 0)
        + x.records
            .filter((r) => new Date(r.date).getFullYear() === ytd)
            .reduce((a, r) => a + (r.cost ?? 0), 0),
      0,
    );
    const totalAlerts = all.reduce((s, x) => s + x.alerts.length, 0);
    return { totalKm, totalRecords, totalSpentYtd, totalAlerts, ytd };
  }, [stats, vehicles]);

  // ─── Per-primary-vehicle derived data ─────────────────────────────────────
  const nextMaintenance = useMemo(() => {
    if (!primary || !primaryStats) return null;
    const candidates: { label: string; kmRemaining: number }[] = [];
    primaryStats.records.forEach((r) => {
      if (r.next_service_km && r.next_service_km > primary.current_km) {
        candidates.push({
          label: r.type.toLowerCase(),
          kmRemaining: r.next_service_km - primary.current_km,
        });
      }
    });
    const lastOil = primaryStats.records
      .filter((r) => r.type === 'Cambio de aceite')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (lastOil) {
      const rem = OIL_CHANGE_KM_INTERVAL - (primary.current_km - lastOil.km_at_service);
      if (rem > 0) candidates.push({ label: 'cambio de aceite', kmRemaining: rem });
    }
    candidates.sort((a, b) => a.kmRemaining - b.kmRemaining);
    return candidates[0] ?? null;
  }, [primary, primaryStats]);

  const nextAppointment = useMemo(() => {
    if (!primaryStats) return null;
    const now = Date.now();
    const future = primaryStats.records
      .filter((r) => r.next_service_date && new Date(r.next_service_date).getTime() > now)
      .sort((a, b) =>
        new Date(a.next_service_date!).getTime() - new Date(b.next_service_date!).getTime())[0];
    if (!future) return null;
    const d = new Date(future.next_service_date!);
    const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' })
      .replace('.', '');
    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return { dayLabel, time, type: future.type };
  }, [primaryStats]);

  const healthScore = useMemo(() => {
    if (!primaryStats) return 100;
    const penalty = primaryStats.alerts.reduce((s, a) => {
      if (a.severity === 'high') return s + 15;
      if (a.severity === 'medium') return s + 8;
      return s + 3;
    }, 0);
    return Math.max(30, 100 - penalty);
  }, [primaryStats]);

  const healthCopy = healthScore >= 85
    ? 'en óptimo estado'
    : healthScore >= 70
      ? 'en buen estado'
      : 'con mantenimiento pendiente';

  const healthDetail = healthScore >= 85
    ? 'Motor, frenos y suspensión dentro de parámetros.'
    : healthScore >= 70
      ? 'Sistemas principales en orden, alertas menores activas.'
      : 'Varios sistemas requieren atención. Revisa las alertas.';

  // Daily km — 30-day window from primary vehicle trips
  const { dailyKm, axisDates } = useMemo(() => {
    const buckets: number[] = new Array(30).fill(0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - 29);
    primaryStats?.trips.forEach((t) => {
      const d = new Date(t.start_datetime); d.setHours(0, 0, 0, 0);
      const idx = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
      if (idx >= 0 && idx < 30) buckets[idx] += t.total_km ?? 0;
    });
    const mid = new Date(start); mid.setDate(start.getDate() + 14);
    return {
      dailyKm: buckets,
      axisDates: [fmtMonthDay(start), fmtMonthDay(mid), fmtMonthDay(today)],
    };
  }, [primaryStats]);

  const sumWindow = dailyKm.reduce((s, v) => s + v, 0);
  const avgPerDay = sumWindow / 30;

  // Month delta + vs-average %
  const thisMonthKm = useMemo(() => {
    if (!primaryStats) return 0;
    const now = new Date();
    return primaryStats.trips
      .filter((t) => {
        const d = new Date(t.start_datetime);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, t) => s + (t.total_km ?? 0), 0);
  }, [primaryStats]);

  const { pctVsAvg, moreOrLess } = useMemo(() => {
    if (!primaryStats || primaryStats.trips.length === 0) {
      return { pctVsAvg: 0, moreOrLess: 'menos' as const };
    }
    const totalTripKm = primaryStats.trips.reduce((s, t) => s + (t.total_km ?? 0), 0);
    const first = primaryStats.trips[primaryStats.trips.length - 1];
    const firstDate = new Date(first.start_datetime);
    const monthsActive = Math.max(
      1,
      (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );
    const monthlyAvg = totalTripKm / monthsActive;
    if (monthlyAvg === 0) return { pctVsAvg: 0, moreOrLess: 'menos' as const };
    const ratio = thisMonthKm / monthlyAvg;
    const pct = Math.round(Math.abs(1 - ratio) * 100);
    return {
      pctVsAvg: pct,
      moreOrLess: (ratio >= 1 ? 'más' : 'menos') as 'más' | 'menos',
    };
  }, [primaryStats, thisMonthKm]);

  // YTD expense breakdown (primary vehicle)
  const expensesByCat = useMemo(() => {
    const cats = { combustible: 0, mantenimiento: 0, seguro: 0 };
    if (!primaryStats) return cats;
    const ytd = new Date().getFullYear();
    primaryStats.expenses
      .filter((e) => new Date(e.date).getFullYear() === ytd)
      .forEach((e) => {
        const c = e.category.toLowerCase();
        if (c.startsWith('combust')) cats.combustible += e.amount;
        else if (c.startsWith('manten') || c.startsWith('repar')) cats.mantenimiento += e.amount;
        else if (c.startsWith('seguro')) cats.seguro += e.amount;
      });
    primaryStats.records
      .filter((r) => new Date(r.date).getFullYear() === ytd)
      .forEach((r) => { cats.mantenimiento += r.cost ?? 0; });
    return cats;
  }, [primaryStats]);

  const totalYtdPrimary =
    expensesByCat.combustible + expensesByCat.mantenimiento + expensesByCat.seguro;

  // First name & last-sync copy
  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) ?? '';
    const fromName = full.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    return (user?.email ?? '').split('@')[0] || 'piloto';
  }, [user]);

  const lastSyncLabel = useMemo(() => {
    if (!loadedAt) return 'AHORA';
    const mins = Math.floor((Date.now() - loadedAt.getTime()) / 60_000);
    if (mins < 1) return 'AHORA';
    if (mins < 60) return `${mins}m AGO`;
    return `${Math.floor(mins / 60)}h AGO`;
  }, [loadedAt]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = () => setShowForm(true);

  const handleCreate = async (data: Parameters<typeof createVehicle>[0]) => {
    try {
      const v = await createVehicle(data);
      toast.success('Vehículo añadido');
      storeSet({ ...v, role: 'owner' });
      navigate('/car');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear vehículo');
    }
  };

  const openPrimary = () => {
    if (!primary) return;
    storeSet(primary);
    navigate('/car');
  };

  // ─── Subtitle copy (hero) ─────────────────────────────────────────────────
  const heroSubtitle = !primary ? (
    <>Aún no has añadido ningún vehículo. Empieza por registrar el primero para
    desbloquear mantenimientos, gastos y alertas.</>
  ) : nextMaintenance ? (
    <>Tu {primary.brand} {primary.model} está {healthCopy}, pero conviene programar
    el {nextMaintenance.label} — quedan{' '}
    <strong style={{ color: '#fff', fontWeight: 600 }}>
      {fmtN(nextMaintenance.kmRemaining)} km
    </strong>.</>
  ) : (
    <>Tu {primary.brand} {primary.model} está {healthCopy}. Sin mantenimientos
    pendientes a la vista — sigue así.</>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ background: '#f5f5f7', minHeight: '100%' }}>
      {/* ═══ BLOCK 1 · INDIGO HERO ═══════════════════════════════════════════ */}
      <section
        className="indigo-hero mx-10 mt-6"
        style={{
          position: 'relative',
          color: '#fff',
          borderRadius: 28,
          overflow: 'hidden',
          background:
            'linear-gradient(184deg, rgb(29,29,31) 18%, rgb(168,211,251) 45%, rgb(0,18,249) 78%, rgb(37,53,224) 98%)',
          padding: 40,
          minHeight: 440,
          display: 'grid',
          gap: 40,
          gridTemplateColumns: '1fr',
        }}
      >
        <style>{`
          @media (min-width: 1280px) {
            .indigo-hero { grid-template-columns: 1.2fr 1fr !important; }
          }
        `}</style>
        <span
          className="mono"
          style={{
            position: 'absolute', left: 24, top: 18, fontSize: 10,
            letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)',
          }}
        >FH · 001 / GARAGE</span>
        <span
          className="mono"
          style={{
            position: 'absolute', right: 24, bottom: 18, fontSize: 10,
            letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)',
          }}
        >SYNC · {lastSyncLabel}</span>

          {/* LEFT */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative', zIndex: 1, gap: 28,
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: 999,
                  background: '#1cb05c',
                  boxShadow: '0 0 0 4px rgba(28,176,92,0.25)',
                }} />
                <span className="mono" style={{
                  fontSize: 11, letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.75)',
                }}>SISTEMA ACTIVO · TU GARAJE</span>
              </div>
              <h1 style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 6vw, 64px)',
                lineHeight: 1.04,
                letterSpacing: '-1.4px',
                color: '#fff',
                margin: '14px 0 6px',
              }}>
                Hola, {firstName}.
              </h1>
              <p style={{
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 300,
                fontSize: 20,
                lineHeight: 1.4,
                letterSpacing: '-0.2px',
                color: 'rgba(255,255,255,0.82)',
                maxWidth: 520,
                margin: 0,
              }}>
                {heroSubtitle}
              </p>
            </div>

            {/* Frosted KPI strip */}
            <div className="indigo-kpis" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 20,
              overflow: 'hidden',
            }}>
              <style>{`
                @media (min-width: 900px) {
                  .indigo-kpis { grid-template-columns: repeat(4, 1fr) !important; }
                  .indigo-kpis > div:nth-child(n+2) { border-left: 1px solid rgba(255,255,255,0.18); }
                }
                @media (max-width: 899px) {
                  .indigo-kpis > div:nth-child(2n) { border-left: 1px solid rgba(255,255,255,0.18); }
                  .indigo-kpis > div:nth-child(n+3) { border-top: 1px solid rgba(255,255,255,0.18); }
                }
              `}</style>
              {[
                ['KM TOTALES',     fmtN(aggregate.totalKm),        'flota completa'],
                ['MANTENIMIENTOS', String(aggregate.totalRecords), 'histórico'],
                ['GASTO YTD',      fmtEur(aggregate.totalSpentYtd), String(aggregate.ytd)],
                ['ALERTAS',        String(aggregate.totalAlerts),  'requieren atención'],
              ].map(([l, v, s]) => (
                <div key={l} style={{ padding: '18px 22px' }}>
                  <div className="label" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.08em' }}>{l}</div>
                  <div style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700, fontSize: 28, lineHeight: 1,
                    letterSpacing: '-0.3px', marginTop: 6, color: '#fff',
                  }}>{v}</div>
                  <div style={{
                    fontFamily: 'Inter, var(--font-sf-pro-text)',
                    fontWeight: 400, fontSize: 12, lineHeight: 1.4,
                    color: 'rgba(255,255,255,0.7)', marginTop: 4,
                  }}>{s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            alignItems: 'stretch', gap: 16,
          }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="pill-dark"
                onClick={handleAdd}
                style={{ background: '#000', color: '#fff' }}
              >
                <Plus size={14} strokeWidth={2.2} style={{ marginRight: 2 }} />
                Añadir vehículo
              </button>
              {primary?.model_3d_url && (
                <button
                  className="pill-ghost"
                  style={{
                    borderColor: 'rgba(255,255,255,0.4)',
                    color: '#fff', background: 'rgba(255,255,255,0.08)',
                  }}
                >
                  Ver modelo 3D
                </button>
              )}
            </div>

            <VehicleRender />

            {primary && (
              <button
                type="button"
                onClick={openPrimary}
                aria-label={`Abrir ${primary.brand} ${primary.model}`}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 16,
                  padding: '14px 18px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: 12,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  transition: 'background 180ms ease, border-color 180ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.34)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)';
                }}
              >
                <div>
                  <div style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 600, fontSize: 18, lineHeight: 1.1,
                    letterSpacing: '-0.2px', color: '#fff',
                  }}>{primary.brand} {primary.model}</div>
                  <div className="mono" style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.7)',
                    marginTop: 6, letterSpacing: '0.06em',
                  }}>
                    {primary.year}
                    {primary.fuel_type && ` · ${primary.fuel_type.toUpperCase()}`}
                    {primary.license_plate && ` · ${primary.license_plate}`}
                    {` · ${primary.role === 'owner' ? 'PROPIETARIO' : primary.role.toUpperCase()}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {primaryStats && primaryStats.alerts.length > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 999,
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontFamily: 'Inter, var(--font-sf-pro-text)',
                      fontWeight: 600, fontSize: 12, color: '#fff',
                      whiteSpace: 'nowrap',
                    }}>
                      ⚠ {primaryStats.alerts.length} alerta{primaryStats.alerts.length === 1 ? '' : 's'}
                    </span>
                  )}
                  <span style={{
                    fontFamily: 'Inter, var(--font-sf-pro-text)',
                    fontSize: 18, color: '#fff', lineHeight: 1,
                  }}>→</span>
                </div>
              </button>
            )}
          </div>
      </section>

      {/* ═══ BLOCK 2 · EDITORIAL BODY ════════════════════════════════════════ */}
      <div style={{
        padding: '60px 80px 80px',
        display: 'flex', flexDirection: 'column', gap: 60,
      }}>
        {loading && !primary ? (
          <BodySkeleton />
        ) : !primary ? (
          <EditorialEmpty onAdd={handleAdd} />
        ) : (
          <>
            {/* ── Section 1 — KILOMETRAJE ───────────────────────────────── */}
            <section className="editorial-grid-2">
              <style>{`
                .editorial-grid-2 {
                  display: grid; grid-template-columns: 1fr; gap: 60px;
                  align-items: end;
                }
                @media (min-width: 900px) {
                  .editorial-grid-2 { grid-template-columns: 1fr 1fr; gap: 60px; }
                }
                .editorial-grid-3 {
                  display: grid; grid-template-columns: 1fr; gap: 24px;
                }
                @media (min-width: 900px) {
                  .editorial-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
                }
              `}</style>
              <div>
                <span className="eyebrow">
                  {primary.model}
                  {primary.license_plate ? ` · ${primary.license_plate}` : ''}
                </span>
                <h1 style={{
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(56px, 9vw, 96px)',
                  lineHeight: 1,
                  letterSpacing: '-2.11px',
                  margin: '12px 0 0',
                  color: '#1d1d1f',
                }}>
                  {fmtN(primary.current_km)}<br />
                  <span style={{ color: '#707070' }}>kilómetros.</span>
                </h1>
                <p style={{
                  fontFamily: 'Inter, var(--font-sf-pro-text)',
                  fontWeight: 300, fontSize: 22, lineHeight: 1.4,
                  letterSpacing: '-0.2px', color: '#474747',
                  maxWidth: 480, margin: '24px 0 0',
                }}>
                  +{fmtN(thisMonthKm)} este mes.{' '}
                  {pctVsAvg > 0
                    ? <>Conduciendo un {pctVsAvg}% {moreOrLess} que la media anual.</>
                    : <>Aún no hay datos suficientes para comparar con la media anual.</>}
                </p>
              </div>

              <div className="card" style={{
                padding: 32, background: '#fff',
                borderRadius: 20, border: '1px solid #e8e8ed',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="eyebrow">Uso diario · 30 días</span>
                  <span className="mono" style={{ fontSize: 11, color: '#a1a1a6' }}>
                    {avgPerDay.toFixed(1).replace('.', ',')} KM/DÍA
                  </span>
                </div>
                <div style={{ marginTop: 20 }}>
                  <Sparkline data={dailyKm} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginTop: 8,
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#a1a1a6',
                }}>
                  {axisDates.map((d) => <span key={d}>{d}</span>)}
                </div>
              </div>
            </section>

            {/* ── Section 2 — MANTENIMIENTO HIGHLIGHT ───────────────────── */}
            <section className="editorial-grid-3">
              {/* Card A — Alerta crítica */}
              <div className="card" style={{
                background: '#fff', borderRadius: 20, border: '1px solid #e8e8ed',
                padding: 28, minHeight: 280,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <span className="eyebrow" style={{ color: '#b64400' }}>● Alerta crítica</span>
                <div>
                  <div style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700, fontSize: 56, lineHeight: 1,
                    letterSpacing: '-0.9px', color: '#1d1d1f',
                  }}>
                    {nextMaintenance ? fmtN(nextMaintenance.kmRemaining) : '—'}
                    {nextMaintenance && (
                      <span style={{
                        fontFamily: 'Inter, var(--font-sf-pro-text)',
                        fontWeight: 300, fontSize: 24, color: '#707070',
                      }}> km</span>
                    )}
                  </div>
                  <p style={{
                    fontFamily: 'Inter, var(--font-sf-pro-text)',
                    fontWeight: 400, fontSize: 17, lineHeight: 1.45,
                    color: '#1d1d1f', margin: '12px 0 0',
                  }}>
                    {nextMaintenance
                      ? <>hasta el {nextMaintenance.label} recomendado.</>
                      : <>sin mantenimientos pendientes a la vista.</>}
                  </p>
                </div>
                <button
                  className="pill-dark"
                  onClick={() => navigate('/maintenance')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Programar →
                </button>
              </div>

              {/* Card B — Salud general */}
              <div className="card-fog" style={{
                background: '#f5f5f7', borderRadius: 20,
                padding: 28, minHeight: 280,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <span className="eyebrow">Salud general</span>
                <div>
                  <div style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700, fontSize: 'clamp(64px, 8vw, 96px)',
                    lineHeight: 1, letterSpacing: '-2.11px', color: '#1d1d1f',
                  }}>{healthScore}</div>
                  <p style={{
                    fontFamily: 'Inter, var(--font-sf-pro-text)',
                    fontWeight: 300, fontSize: 17, lineHeight: 1.45,
                    color: '#474747', margin: '4px 0 0',
                  }}>
                    sobre 100. {healthDetail}
                  </p>
                </div>
                <button
                  className="pill-ghost"
                  onClick={openPrimary}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Ver desglose
                </button>
              </div>

              {/* Card C — Próximo taller */}
              <div style={{
                background: '#000', color: '#fff',
                borderRadius: 20, padding: 28, minHeight: 280,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Próximo taller
                </span>
                <div>
                  {nextAppointment ? (
                    <>
                      <div style={{
                        fontFamily: 'Inter, var(--font-sf-pro-display)',
                        fontWeight: 700, fontSize: 32, lineHeight: 1.1,
                        letterSpacing: '-0.4px',
                        textTransform: 'capitalize',
                      }}>
                        {nextAppointment.dayLabel}<br />{nextAppointment.time}
                      </div>
                      <p style={{
                        fontFamily: 'Inter, var(--font-sf-pro-text)',
                        fontWeight: 400, fontSize: 15, lineHeight: 1.45,
                        color: 'rgba(255,255,255,0.7)', margin: '12px 0 0',
                      }}>
                        {primary.brand} {primary.model} · {nextAppointment.type}.
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{
                        fontFamily: 'Inter, var(--font-sf-pro-display)',
                        fontWeight: 700, fontSize: 32, lineHeight: 1.1,
                        letterSpacing: '-0.4px',
                      }}>
                        Sin cita<br />programada
                      </div>
                      <p style={{
                        fontFamily: 'Inter, var(--font-sf-pro-text)',
                        fontWeight: 400, fontSize: 15, lineHeight: 1.45,
                        color: 'rgba(255,255,255,0.7)', margin: '12px 0 0',
                      }}>
                        Añade una fecha al próximo mantenimiento para reservar tu hueco.
                      </p>
                    </>
                  )}
                </div>
                <button
                  className="pill"
                  onClick={() => navigate('/maintenance')}
                  style={{ background: '#fff', color: '#000', alignSelf: 'flex-start' }}
                >
                  {nextAppointment ? 'Ver cita →' : 'Programar →'}
                </button>
              </div>
            </section>

            {/* ── Section 3 — GASTOS one-liner ──────────────────────────── */}
            <section className="gastos-row" style={{ marginBottom: 80 }}>
              <style>{`
                .gastos-row {
                  display: flex; justify-content: space-between; align-items: flex-end;
                  border-top: 1px solid #e8e8ed; padding-top: 36px;
                  flex-wrap: wrap; gap: 32px;
                }
                .gastos-meta {
                  display: flex; gap: 48px; align-items: flex-end; flex-wrap: wrap;
                }
              `}</style>
              <div>
                <span className="eyebrow">Gasto acumulado · {aggregate.ytd}</span>
                <h2 style={{
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(48px, 7vw, 80px)',
                  lineHeight: 1,
                  letterSpacing: '-1.7px',
                  margin: '10px 0 0',
                  color: '#1d1d1f',
                }}>
                  {fmtN(totalYtdPrimary)} <span style={{ color: '#707070' }}>€</span>
                </h2>
              </div>
              <div className="gastos-meta">
                {[
                  ['COMBUSTIBLE',   expensesByCat.combustible],
                  ['MANTENIMIENTO', expensesByCat.mantenimiento],
                  ['SEGURO',        expensesByCat.seguro],
                ].map(([lbl, val]) => (
                  <div key={lbl as string}>
                    <span className="label" style={{ color: '#707070' }}>{lbl}</span>
                    <div style={{
                      fontFamily: 'Inter, var(--font-sf-pro-display)',
                      fontWeight: 600, fontSize: 28, lineHeight: 1,
                      color: '#1d1d1f', marginTop: 8,
                    }}>{fmtEur(val as number)}</div>
                  </div>
                ))}
                <button className="pill" onClick={() => navigate('/expenses')}>
                  Detalle →
                </button>
              </div>
            </section>

            {/* ── Flota registrada ──────────────────────────────────────── */}
            <section style={{ borderTop: '1px solid #e8e8ed', paddingTop: 36 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                <span className="eyebrow">
                  Flota registrada · {vehicles.length} vehículo{vehicles.length === 1 ? '' : 's'}
                </span>
                <span className="mono" style={{ fontSize: 11, color: '#a1a1a6' }}>
                  CLIC PARA SELECCIONAR
                </span>
              </div>
              <div style={{
                marginTop: 24,
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}>
                {vehicles.map((v) => (
                  <VehicleGridCard
                    key={v.id}
                    vehicle={v}
                    stats={stats[v.id]}
                    isPrimary={v.id === primary?.id}
                    onSelect={() => {
                      storeSet(v);
                      navigate('/car');
                    }}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {showForm && (
        <VehicleForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
};

// ─── Sparkline ──────────────────────────────────────────────────────────────
const Sparkline = ({ data, width = 460, height = 120 }: {
  data: number[]; width?: number; height?: number;
}) => {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - (v / max) * (height - 8) - 4;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={area} fill="rgba(29,29,31,0.06)" />
      <path d={line} fill="none" stroke="#1d1d1f" strokeWidth={1.5} />
    </svg>
  );
};

// ─── Vehicle render placeholder — SVG silhouette ────────────────────────────
const VehicleRender = () => (
  <div style={{
    width: '100%', maxWidth: 460, height: 240, alignSelf: 'flex-end',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
  }}>
    <svg viewBox="0 0 460 240" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="vh-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M40 165 L90 110 Q110 95 140 92 L260 88 Q310 88 345 105 L400 140 Q420 145 425 165 L425 180 Q425 188 415 188 L370 188 Q364 200 348 200 Q332 200 326 188 L160 188 Q154 200 138 200 Q122 200 116 188 L48 188 Q38 188 38 178 Z"
        fill="url(#vh-shine)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.25"
      />
      <path
        d="M120 110 L160 90 L250 90 L260 110 Z M270 110 L260 90 L330 90 Q345 92 360 110 Z"
        fill="rgba(255,255,255,0.25)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
      />
      <circle cx="138" cy="190" r="14" fill="#0a0a14" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <circle cx="348" cy="190" r="14" fill="#0a0a14" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <circle cx="138" cy="190" r="5" fill="rgba(255,255,255,0.35)" />
      <circle cx="348" cy="190" r="5" fill="rgba(255,255,255,0.35)" />
    </svg>
  </div>
);

// ─── Body skeleton — minimal, zero-shadow ───────────────────────────────────
const BodySkeleton = () => (
  <div style={{
    display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{
        height: 220, borderRadius: 20, background: '#fff',
        border: '1px solid #e8e8ed',
      }} className="skeleton" />
    ))}
  </div>
);

// ─── Vehicle Grid Card (fleet) ──────────────────────────────────────────────
interface VehicleGridCardProps {
  vehicle: VehicleWithAccess;
  stats?: VehicleStats;
  isPrimary: boolean;
  onSelect: () => void;
}

const VehicleGridCard = ({
  vehicle, stats, isPrimary, onSelect,
}: VehicleGridCardProps) => {
  const alertCount = stats?.alerts.length ?? 0;
  const recordCount = stats?.records.length ?? 0;

  return (
    <button
      onClick={onSelect}
      style={{
        all: 'unset',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        background: '#fff',
        border: isPrimary ? '2px solid #0071e3' : '1px solid #e8e8ed',
        borderRadius: 20,
        padding: 20,
        minHeight: 200,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: isPrimary ? 1 : 0.8,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#0071e3';
        (e.currentTarget as HTMLElement).style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isPrimary ? '#0071e3' : '#e8e8ed';
        (e.currentTarget as HTMLElement).style.opacity = isPrimary ? '1' : '0.8';
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: '-0.2px',
              color: '#1d1d1f',
              margin: '0 0 4px',
            }}>
              {vehicle.brand} {vehicle.model}
            </h3>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#a1a1a6',
              letterSpacing: '0.08em',
              marginBottom: 8,
            }}>
              {vehicle.year}
              {vehicle.fuel_type && ` · ${vehicle.fuel_type}`}
              {vehicle.license_plate && ` · ${vehicle.license_plate}`}
            </div>
          </div>
          {alertCount > 0 ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 999,
              background: '#b64400',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              ⚠ {alertCount}
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#1cb05c',
              color: '#fff',
              fontSize: 10,
            }}>
              ✓
            </span>
          )}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginTop: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#a1a1a6', marginBottom: 4 }}>KM</div>
            <div style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 600,
              fontSize: 20,
              color: '#1d1d1f',
            }}>
              {fmtN(vehicle.current_km)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#a1a1a6', marginBottom: 4 }}>SVC</div>
            <div style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 600,
              fontSize: 20,
              color: '#1d1d1f',
            }}>
              {recordCount}
            </div>
          </div>
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: '#a1a1a6',
        marginTop: 12,
      }}>
        {isPrimary ? '✓ Vehículo principal' : 'Haz click para seleccionar'}
      </div>
    </button>
  );
};

const EditorialEmpty = ({ onAdd }: { onAdd: () => void }) => (
  <div style={{
    padding: '40px 0', display: 'flex', flexDirection: 'column',
    gap: 20, maxWidth: 640,
  }}>
    <span className="eyebrow">Tu garaje · vacío</span>
    <h2 style={{
      fontFamily: 'Inter, var(--font-sf-pro-display)',
      fontWeight: 700, fontSize: 'clamp(40px, 6vw, 64px)',
      lineHeight: 1.04, letterSpacing: '-1.4px',
      margin: 0, color: '#1d1d1f',
    }}>
      Empieza añadiendo<br />
      <span style={{ color: '#707070' }}>tu primer vehículo.</span>
    </h2>
    <p style={{
      fontFamily: 'Inter, var(--font-sf-pro-text)',
      fontWeight: 300, fontSize: 20, lineHeight: 1.4,
      letterSpacing: '-0.2px', color: '#474747', maxWidth: 520, margin: 0,
    }}>
      Registra marca, modelo y kilometraje. A partir de ahí, FocusHub te avisará
      de mantenimientos y agrupará gastos y trayectos.
    </p>
    <button
      className="pill-dark"
      onClick={onAdd}
      style={{ alignSelf: 'flex-start', marginTop: 8 }}
    >
      <Plus size={14} strokeWidth={2.2} style={{ marginRight: 2 }} />
      Añadir vehículo
    </button>
  </div>
);
