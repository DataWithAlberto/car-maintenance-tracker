import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, CheckCircle2, ArrowRight, Calendar, Fuel,
  Wrench, Receipt, Route, SlidersHorizontal, RotateCcw,
} from 'lucide-react';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { useDashboardPrefs } from '../hooks/useDashboardPrefs';
import type { DashboardWidget } from '../hooks/useDashboardPrefs';
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

// Spanish role labels — never expose raw role strings to UI
const ROLE_LABEL: Record<string, string> = {
  owner:  'Propietario',
  editor: 'Editor',
  viewer: 'Solo lectura',
};

interface VehicleStats {
  vehicle: VehicleWithAccess;
  records: MaintenanceRecord[];
  expenses: Expense[];
  trips: Trip[];
  alerts: Alert[];
  errors: { records: boolean; expenses: boolean; trips: boolean };
}

export const DashboardPage = () => {
  const { vehicles, loading, fetchVehicles, createVehicle } = useVehicle();
  const { setSelectedVehicle: storeSet } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [stats, setStats] = useState<Record<string, VehicleStats>>({});
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const { isVisible, toggle, reset, hidden } = useDashboardPrefs();

  // Derived: per-vehicle stats are loaded once every vehicle has an entry in `stats`.
  const statsLoading = vehicles.length > 0
    && vehicles.some((v) => !stats[v.id]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  useEffect(() => {
    if (vehicles.length === 0) return;
    Promise.all(
      vehicles.map(async (v) => {
        // Track partial errors so the UI can communicate "fallo de carga"
        // distinctly from "no hay datos".
        const errors = { records: false, expenses: false, trips: false };
        const [records, expenses, trips] = await Promise.all([
          maintenanceService.getByVehicle(v.id).catch(() => { errors.records = true; return []; }),
          expensesService.getByVehicle(v.id).catch(() => { errors.expenses = true; return []; }),
          tripsService.getByVehicle(v.id).catch(() => { errors.trips = true; return []; }),
        ]);
        return {
          id: v.id,
          data: {
            vehicle: v,
            records,
            expenses,
            trips,
            alerts: calculateAlerts(v, records).filter((a) => !a.is_dismissed),
            errors,
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
    const yearNow = new Date().getFullYear();
    const totalKm = vehicles.reduce((s, v) => s + v.current_km, 0);
    const totalRecords = all.reduce((s, x) => s + x.records.length, 0);
    const totalSpent = all.reduce(
      (s, x) =>
        s
        + x.expenses
            .filter((e) => new Date(e.date).getFullYear() === yearNow)
            .reduce((a, e) => a + e.amount, 0)
        + x.records
            .filter((r) => new Date(r.date).getFullYear() === yearNow)
            .reduce((a, r) => a + (r.cost ?? 0), 0),
      0,
    );
    const totalAlerts = all.reduce((s, x) => s + x.alerts.length, 0);
    return { totalKm, totalRecords, totalSpent, totalAlerts, year: yearNow };
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
    const yearNow = new Date().getFullYear();
    primaryStats.expenses
      .filter((e) => new Date(e.date).getFullYear() === yearNow)
      .forEach((e) => {
        const c = e.category.toLowerCase();
        if (c.startsWith('combust')) cats.combustible += e.amount;
        else if (c.startsWith('manten') || c.startsWith('repar')) cats.mantenimiento += e.amount;
        else if (c.startsWith('seguro')) cats.seguro += e.amount;
      });
    primaryStats.records
      .filter((r) => new Date(r.date).getFullYear() === yearNow)
      .forEach((r) => { cats.mantenimiento += r.cost ?? 0; });
    return cats;
  }, [primaryStats]);

  const totalYtdPrimary =
    expensesByCat.combustible + expensesByCat.mantenimiento + expensesByCat.seguro;

  // First name & last-sync copy (Spanish: "actualizado hace X")
  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) ?? '';
    const fromName = full.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    return (user?.email ?? '').split('@')[0] || 'piloto';
  }, [user]);

  const lastSyncLabel = useMemo(() => {
    if (!loadedAt) return 'actualizando…';
    const mins = Math.floor((Date.now() - loadedAt.getTime()) / 60_000);
    if (mins < 1) return 'actualizado ahora';
    if (mins < 60) return `actualizado hace ${mins} min`;
    return `actualizado hace ${Math.floor(mins / 60)} h`;
  }, [loadedAt]);

  // ─── Hero CTA — context-aware ─────────────────────────────────────────────
  const heroCta = useMemo(() => {
    if (!primary) {
      return {
        label: 'Añadir vehículo',
        icon: Plus,
        action: () => setShowForm(true),
      };
    }
    if (primaryStats?.alerts.length || nextMaintenance) {
      return {
        label: 'Programar mantenimiento',
        icon: Wrench,
        action: () => navigate('/maintenance'),
      };
    }
    if (primaryStats && primaryStats.expenses.length === 0) {
      return {
        label: 'Registrar primer gasto',
        icon: Receipt,
        action: () => navigate('/expenses'),
      };
    }
    if (primaryStats && primaryStats.trips.length === 0) {
      return {
        label: 'Registrar viaje',
        icon: Route,
        action: () => navigate('/trips'),
      };
    }
    return {
      label: 'Programar mantenimiento',
      icon: Wrench,
      action: () => navigate('/maintenance'),
    };
  }, [primary, primaryStats, nextMaintenance, navigate]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => setShowForm(true), []);

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

  const HeroCtaIcon = heroCta.icon;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ background: '#f5f5f7', minHeight: '100%' }}>
      {/* ═══ BLOCK 1 · INDIGO HERO ═══════════════════════════════════════════ */}
      <section
        className="hero-shell"
        aria-labelledby="hero-greeting"
      >
        <span
          className="mono"
          style={{
            position: 'absolute', left: 18, top: 14, fontSize: 10,
            letterSpacing: '0.1em', color: 'rgba(255,255,255,0.85)',
          }}
          aria-hidden="true"
        >FH · 001 · GARAJE</span>
        <span
          className="mono"
          style={{
            position: 'absolute', right: 18, bottom: 14, fontSize: 10,
            letterSpacing: '0.05em', color: 'rgba(255,255,255,0.85)',
          }}
          aria-live="polite"
        >{lastSyncLabel}</span>

        {/* LEFT */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          position: 'relative', zIndex: 1, gap: 28,
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 7, height: 7, borderRadius: 999,
                  background: '#1cb05c',
                  boxShadow: '0 0 0 4px rgba(28,176,92,0.25)',
                }}
              />
              <span className="mono" style={{
                fontSize: 11, letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.92)',
              }}>Sistema activo · Tu garaje</span>
            </div>
            <h1
              id="hero-greeting"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 'clamp(36px, 6vw, 64px)',
                lineHeight: 1.04,
                letterSpacing: '-1.4px',
                color: '#fff',
                margin: '14px 0 6px',
              }}
            >
              Hola, {firstName}.
            </h1>
            <p style={{
              fontFamily: 'Inter, var(--font-sf-pro-text)',
              fontWeight: 300,
              fontSize: 'clamp(16px, 1.7vw, 20px)',
              lineHeight: 1.4,
              letterSpacing: '-0.2px',
              color: 'rgba(255,255,255,0.92)',
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
            background: 'rgba(255,255,255,0.14)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
            role="list"
            aria-label="Métricas globales del garaje"
          >
            <style>{`
              @media (min-width: 900px) {
                .indigo-kpis { grid-template-columns: repeat(4, 1fr) !important; }
                .indigo-kpis > div:nth-child(n+2) { border-left: 1px solid rgba(255,255,255,0.22); }
              }
              @media (max-width: 899px) {
                .indigo-kpis > div:nth-child(2n) { border-left: 1px solid rgba(255,255,255,0.22); }
                .indigo-kpis > div:nth-child(n+3) { border-top: 1px solid rgba(255,255,255,0.22); }
              }
            `}</style>
            {[
              ['Km totales',     fmtN(aggregate.totalKm),                'flota completa'],
              ['Mantenimientos', String(aggregate.totalRecords),         'histórico'],
              [`Gasto ${aggregate.year}`, fmtEur(aggregate.totalSpent), 'año en curso'],
              ['Alertas',        String(aggregate.totalAlerts),          'requieren atención'],
            ].map(([l, v, s]) => (
              <div key={l as string} role="listitem" style={{ padding: '18px 22px' }}>
                <div className="label" style={{
                  color: 'rgba(255,255,255,0.85)', fontSize: 11, letterSpacing: '0.08em',
                }}>{l}</div>
                <div style={{
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                  fontWeight: 700, fontSize: 28, lineHeight: 1,
                  letterSpacing: '-0.3px', marginTop: 6, color: '#fff',
                }}>{v}</div>
                <div style={{
                  fontFamily: 'Inter, var(--font-sf-pro-text)',
                  fontWeight: 400, fontSize: 12, lineHeight: 1.4,
                  color: 'rgba(255,255,255,0.85)', marginTop: 4,
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pill-ghost focus-on-dark"
              onClick={() => setShowCustomize(true)}
              aria-label="Personalizar panel: mostrar u ocultar widgets"
              style={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: '#fff', background: 'rgba(255,255,255,0.10)',
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={2.2} />
              Personalizar
            </button>
            <button
              type="button"
              className="pill-dark focus-on-dark"
              onClick={heroCta.action}
              aria-label={heroCta.label}
              style={{ background: '#000', color: '#fff' }}
            >
              <HeroCtaIcon size={14} strokeWidth={2.2} />
              {heroCta.label}
            </button>
          </div>

          <VehicleRender />

          {primary && (
            <button
              type="button"
              onClick={openPrimary}
              className="focus-on-dark"
              aria-label={`Abrir detalle del ${primary.brand} ${primary.model}`}
              style={{
                all: 'unset',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: 16,
                padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 12,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                transition: 'background 180ms ease, border-color 180ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.20)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.40)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.28)';
              }}
            >
              <div>
                <div style={{
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                  fontWeight: 600, fontSize: 18, lineHeight: 1.1,
                  letterSpacing: '-0.2px', color: '#fff',
                }}>{primary.brand} {primary.model}</div>
                <div className="mono" style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.85)',
                  marginTop: 6, letterSpacing: '0.06em',
                }}>
                  {primary.year}
                  {primary.fuel_type && ` · ${primary.fuel_type}`}
                  {primary.license_plate && ` · ${primary.license_plate}`}
                  {` · ${ROLE_LABEL[primary.role] ?? primary.role}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {primaryStats && primaryStats.alerts.length > 0 && (
                  <span
                    role="status"
                    aria-label={`${primaryStats.alerts.length} alertas pendientes`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 999,
                      background: 'rgba(255,255,255,0.22)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      fontFamily: 'Inter, var(--font-sf-pro-text)',
                      fontWeight: 600, fontSize: 12, color: '#fff',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <AlertTriangle size={12} strokeWidth={2.2} aria-hidden="true" />
                    {primaryStats.alerts.length} alerta{primaryStats.alerts.length === 1 ? '' : 's'}
                  </span>
                )}
                <ArrowRight size={18} strokeWidth={2} color="#fff" aria-hidden="true" />
              </div>
            </button>
          )}
        </div>
      </section>

      {/* ═══ BLOCK 2 · EDITORIAL BODY ════════════════════════════════════════ */}
      <div className="editorial-body">
        {loading && !primary ? (
          <BodySkeleton />
        ) : !primary ? (
          <EditorialEmpty onAdd={handleAdd} />
        ) : (
          <>
            {/* ── Section 1 — KILOMETRAJE ───────────────────────────────── */}
            {isVisible('kilometraje') && (
              <section
                className="editorial-grid-2"
                aria-labelledby="km-title"
              >
                <style>{`
                  .editorial-grid-2 {
                    display: grid; grid-template-columns: 1fr; gap: 40px;
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
                  <h2 id="km-title" className="display-xxl" style={{ marginTop: 12 }}>
                    {fmtN(primary.current_km)}<br />
                    <span style={{ color: '#707070' }}>kilómetros.</span>
                  </h2>
                  <p className="body-soft" style={{ maxWidth: 480, margin: '24px 0 0' }}>
                    +{fmtN(thisMonthKm)} este mes.{' '}
                    {pctVsAvg > 0
                      ? <>Conduciendo un {pctVsAvg}% {moreOrLess} que la media anual.</>
                      : <>Aún no hay datos suficientes para comparar con la media anual.</>}
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="pill-dark"
                      onClick={() => navigate('/trips')}
                      aria-label="Registrar nuevo viaje"
                    >
                      <Plus size={14} strokeWidth={2.2} />
                      Registrar viaje
                    </button>
                    <button
                      type="button"
                      className="pill-ghost"
                      onClick={() => navigate('/trips')}
                    >
                      Ver todos los viajes
                    </button>
                  </div>
                </div>

                <div className="card" style={{
                  padding: 32, background: '#fff',
                  borderRadius: 20, border: '1px solid #e8e8ed',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="eyebrow">Uso diario · 30 días</span>
                    <span className="mono" style={{ fontSize: 11, color: '#707070' }}>
                      {avgPerDay.toFixed(1).replace('.', ',')} km/día
                    </span>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    {primaryStats?.errors.trips ? (
                      <WidgetError onRetry={() => fetchVehicles()} message="No se pudieron cargar los viajes." />
                    ) : statsLoading && !primaryStats ? (
                      <WidgetLoading height={120} />
                    ) : sumWindow === 0 ? (
                      <WidgetEmpty
                        icon={Route}
                        message="Sin viajes en los últimos 30 días."
                        ctaLabel="Registrar viaje"
                        onCta={() => navigate('/trips')}
                      />
                    ) : (
                      <Sparkline data={dailyKm} />
                    )}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 8,
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: '#a1a1a6',
                  }}>
                    {axisDates.map((d) => <span key={d}>{d}</span>)}
                  </div>
                </div>
              </section>
            )}

            {/* ── Section 2 — MANTENIMIENTO HIGHLIGHT ───────────────────── */}
            {isVisible('mantenimiento') && (
              <section className="editorial-grid-3" aria-label="Estado de mantenimiento">
                {/* Card A — Alerta crítica */}
                <div className="card" style={{
                  background: '#fff', borderRadius: 20, border: '1px solid #e8e8ed',
                  padding: 28, minHeight: 280,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <span
                    className="eyebrow"
                    style={{ color: '#b64400', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <AlertTriangle size={11} strokeWidth={2.4} aria-hidden="true" />
                    Alerta crítica
                  </span>
                  <div>
                    <div style={{
                      fontFamily: 'Inter, var(--font-sf-pro-display)',
                      fontWeight: 700, fontSize: 'clamp(40px, 5vw, 56px)', lineHeight: 1,
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
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="pill-dark"
                      onClick={() => navigate('/maintenance')}
                      aria-label={nextMaintenance ? 'Programar mantenimiento' : 'Añadir mantenimiento'}
                    >
                      <Wrench size={14} strokeWidth={2.2} />
                      {nextMaintenance ? 'Programar' : 'Añadir'}
                      <ArrowRight size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                {/* Card B — Salud general */}
                <div className="card-fog" style={{
                  background: '#f5f5f7', borderRadius: 20,
                  padding: 28, minHeight: 280,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <span className="eyebrow">Salud general</span>
                  <div>
                    <div
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={healthScore}
                      aria-label={`Salud del vehículo: ${healthScore} sobre 100`}
                      style={{
                        fontFamily: 'Inter, var(--font-sf-pro-display)',
                        fontWeight: 700, fontSize: 'clamp(56px, 8vw, 96px)',
                        lineHeight: 1, letterSpacing: '-2.11px', color: '#1d1d1f',
                      }}
                    >{healthScore}</div>
                    <p style={{
                      fontFamily: 'Inter, var(--font-sf-pro-text)',
                      fontWeight: 300, fontSize: 17, lineHeight: 1.45,
                      color: '#474747', margin: '4px 0 0',
                    }}>
                      sobre 100. {healthDetail}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pill-ghost"
                    onClick={openPrimary}
                    aria-label="Ver desglose detallado del vehículo"
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
                  <span
                    className="eyebrow"
                    style={{ color: 'rgba(255,255,255,0.75)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Calendar size={11} strokeWidth={2.4} aria-hidden="true" />
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
                          color: 'rgba(255,255,255,0.78)', margin: '12px 0 0',
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
                          color: 'rgba(255,255,255,0.78)', margin: '12px 0 0',
                        }}>
                          Añade una fecha al próximo mantenimiento para reservar tu hueco.
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="pill focus-on-dark"
                    onClick={() => navigate('/maintenance')}
                    aria-label={nextAppointment ? 'Ver cita en mantenimiento' : 'Programar nueva cita'}
                    style={{ background: '#fff', color: '#000', alignSelf: 'flex-start' }}
                  >
                    {nextAppointment ? 'Ver cita' : 'Programar'}
                    <ArrowRight size={13} strokeWidth={2.2} />
                  </button>
                </div>
              </section>
            )}

            {/* ── Section 3 — GASTOS one-liner ──────────────────────────── */}
            {isVisible('gastos') && (
              <section className="gastos-row" style={{ marginBottom: 80 }} aria-labelledby="gastos-title">
                <style>{`
                  .gastos-row {
                    display: flex; justify-content: space-between; align-items: flex-end;
                    border-top: 1px solid #e8e8ed; padding-top: 36px;
                    flex-wrap: wrap; gap: 32px;
                  }
                  .gastos-meta {
                    display: flex; gap: 32px; align-items: flex-end; flex-wrap: wrap;
                  }
                `}</style>
                <div>
                  <span className="eyebrow">Gasto acumulado · {aggregate.year}</span>
                  <h2 id="gastos-title" className="display-xl" style={{ marginTop: 10 }}>
                    {primaryStats?.errors.expenses ? (
                      <span style={{ color: '#b64400', fontSize: 24 }}>Datos no disponibles</span>
                    ) : (
                      <>{fmtN(totalYtdPrimary)} <span style={{ color: '#707070' }}>€</span></>
                    )}
                  </h2>
                </div>
                <div className="gastos-meta">
                  {[
                    ['Combustible',   expensesByCat.combustible,   Fuel],
                    ['Mantenimiento', expensesByCat.mantenimiento, Wrench],
                    ['Seguro',        expensesByCat.seguro,        Receipt],
                  ].map(([lbl, val, Icon]) => {
                    const Cmp = Icon as typeof Fuel;
                    return (
                      <div key={lbl as string}>
                        <span className="label" style={{
                          color: '#707070', display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                          <Cmp size={11} strokeWidth={2.2} aria-hidden="true" />
                          {lbl as string}
                        </span>
                        <div style={{
                          fontFamily: 'Inter, var(--font-sf-pro-display)',
                          fontWeight: 600, fontSize: 28, lineHeight: 1,
                          color: '#1d1d1f', marginTop: 8,
                        }}>{fmtEur(val as number)}</div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      className="pill-dark"
                      onClick={() => navigate('/expenses')}
                      aria-label="Añadir nuevo gasto"
                    >
                      <Plus size={14} strokeWidth={2.2} />
                      Añadir gasto
                    </button>
                    <button
                      type="button"
                      className="pill"
                      onClick={() => navigate('/expenses')}
                      aria-label="Ver detalle completo de gastos"
                    >
                      Detalle
                      <ArrowRight size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ── Flota registrada ──────────────────────────────────────── */}
            {isVisible('flota') && (
              <section style={{ borderTop: '1px solid #e8e8ed', paddingTop: 36 }} aria-labelledby="flota-title">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                  <span id="flota-title" className="eyebrow">
                    Flota registrada · {vehicles.length} vehículo{vehicles.length === 1 ? '' : 's'}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: '#707070' }}>
                    Haz clic en uno para abrirlo
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
                  <button
                    type="button"
                    onClick={handleAdd}
                    aria-label="Añadir nuevo vehículo a la flota"
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 10, minHeight: 200,
                      background: '#f5f5f7',
                      border: '1.5px dashed #d2d2d7',
                      borderRadius: 20,
                      color: '#474747',
                      fontFamily: 'Inter, var(--font-sf-pro-text)',
                      fontWeight: 500, fontSize: 14,
                      transition: 'border-color 180ms ease, background 180ms ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#0071e3';
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#d2d2d7';
                      (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                    }}
                  >
                    <Plus size={22} strokeWidth={1.8} aria-hidden="true" />
                    Añadir otro vehículo
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {showForm && (
        <VehicleForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}

      {showCustomize && (
        <CustomizePanel
          hidden={hidden}
          toggle={toggle}
          reset={reset}
          onClose={() => setShowCustomize(false)}
        />
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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Tendencia de kilómetros diarios: máximo ${Math.round(max)} km`}
    >
      <path d={area} fill="rgba(29,29,31,0.06)" />
      <path d={line} fill="none" stroke="#1d1d1f" strokeWidth={1.5} />
    </svg>
  );
};

// ─── Per-widget states ──────────────────────────────────────────────────────
const WidgetLoading = ({ height = 120 }: { height?: number }) => (
  <div
    className="skeleton"
    role="status"
    aria-label="Cargando datos"
    style={{ height, borderRadius: 12 }}
  />
);

const WidgetEmpty = ({
  icon: Icon, message, ctaLabel, onCta,
}: {
  icon: typeof Plus; message: string; ctaLabel?: string; onCta?: () => void;
}) => (
  <div style={{
    height: 120, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    background: '#fafafa', border: '1px dashed #e8e8ed',
    borderRadius: 12, color: '#707070',
    fontFamily: 'Inter, var(--font-sf-pro-text)', fontSize: 13,
  }}>
    <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
    <span>{message}</span>
    {ctaLabel && onCta && (
      <button
        type="button"
        onClick={onCta}
        style={{
          all: 'unset', cursor: 'pointer',
          color: '#0071e3', fontWeight: 500, fontSize: 12,
          textDecoration: 'underline',
        }}
      >
        {ctaLabel}
      </button>
    )}
  </div>
);

const WidgetError = ({ onRetry, message }: { onRetry: () => void; message: string }) => (
  <div
    role="alert"
    style={{
      height: 120, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      background: '#fff1ea', border: '1px solid #f4cdb6',
      borderRadius: 12, color: '#b64400', fontSize: 13,
      fontFamily: 'Inter, var(--font-sf-pro-text)',
    }}
  >
    <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
    <span>{message}</span>
    <button
      type="button"
      onClick={onRetry}
      style={{
        all: 'unset', cursor: 'pointer', color: '#b64400',
        fontWeight: 500, fontSize: 12, textDecoration: 'underline',
      }}
    >
      Reintentar
    </button>
  </div>
);

const VehicleRender = () => (
  <div style={{
    width: '100%', maxWidth: 520, alignSelf: 'flex-end',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
  }}>
    <img
      src="/images/ford-focus.png"
      alt=""
      role="presentation"
      loading="eager"
      style={{
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
        pointerEvents: 'none',
        userSelect: 'none',
        filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.45))',
      }}
      onError={(e) => {
        // Hide silently if file is missing — the hero KPI strip carries weight.
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  </div>
);

// ─── Body skeleton — minimal, zero-shadow ───────────────────────────────────
const BodySkeleton = () => (
  <div
    role="status"
    aria-label="Cargando panel"
    style={{
      display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    }}
  >
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
  const hasError = stats?.errors && (stats.errors.records || stats.errors.expenses || stats.errors.trips);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Abrir ${vehicle.brand} ${vehicle.model}${isPrimary ? ' (vehículo principal)' : ''}${alertCount > 0 ? `, ${alertCount} alertas` : ''}`}
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
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#0071e3';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isPrimary ? '#0071e3' : '#e8e8ed';
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
              color: '#707070',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              {vehicle.year}
              {vehicle.fuel_type && ` · ${vehicle.fuel_type}`}
              {vehicle.license_plate && ` · ${vehicle.license_plate}`}
            </div>
          </div>
          {alertCount > 0 ? (
            <span
              role="status"
              aria-label={`${alertCount} alertas pendientes`}
              className="sev-critical"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 999,
                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              <AlertTriangle size={12} strokeWidth={2.2} aria-hidden="true" />
              {alertCount}
            </span>
          ) : (
            <span
              role="status"
              aria-label="Sin alertas"
              className="sev-ok"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%',
              }}
            >
              <CheckCircle2 size={13} strokeWidth={2.4} aria-hidden="true" />
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
            <div style={{ fontSize: 11, color: '#707070', marginBottom: 4 }}>Kilómetros</div>
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
            <div style={{ fontSize: 11, color: '#707070', marginBottom: 4 }}>Mantenimientos</div>
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
        color: hasError ? '#b64400' : '#707070',
        marginTop: 12,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        {hasError && <AlertTriangle size={11} strokeWidth={2.2} aria-hidden="true" />}
        {hasError
          ? 'Algunos datos no se pudieron cargar'
          : isPrimary
            ? '✓ Vehículo principal'
            : 'Haz clic para seleccionar'}
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
    <h2 className="display-lg">
      Empieza añadiendo<br />
      <span style={{ color: '#707070' }}>tu primer vehículo.</span>
    </h2>
    <p className="body-soft" style={{ maxWidth: 520, margin: 0 }}>
      Registra marca, modelo y kilometraje. A partir de ahí, FocusHub te avisará
      de mantenimientos y agrupará gastos y trayectos.
    </p>
    <button
      type="button"
      className="pill-dark"
      onClick={onAdd}
      style={{ alignSelf: 'flex-start', marginTop: 8 }}
      aria-label="Añadir primer vehículo"
    >
      <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
      Añadir vehículo
    </button>
  </div>
);

// ─── Customize panel — MVP widget toggle ────────────────────────────────────
interface CustomizePanelProps {
  hidden: DashboardWidget[];
  toggle: (w: DashboardWidget) => void;
  reset: () => void;
  onClose: () => void;
}

const WIDGETS: { key: DashboardWidget; label: string; description: string }[] = [
  { key: 'kilometraje',   label: 'Kilometraje',     description: 'Total y uso diario de los últimos 30 días.' },
  { key: 'mantenimiento', label: 'Mantenimiento',   description: 'Alerta crítica, salud y próximo taller.' },
  { key: 'gastos',        label: 'Gastos del año',  description: 'Combustible, mantenimiento y seguro.' },
  { key: 'flota',         label: 'Flota registrada', description: 'Tarjetas con todos tus vehículos.' },
];

const CustomizePanel = ({ hidden, toggle, reset, onClose }: CustomizePanelProps) => {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(20,22,28,0.42)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fade-in 0.2s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 24,
        border: '1px solid #e8e8ed',
        maxWidth: 480, width: '100%',
        padding: 28,
        fontFamily: 'Inter, var(--font-sf-pro-text)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 id="customize-title" style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 600, fontSize: 20, letterSpacing: '-0.3px',
            color: '#1d1d1f', margin: 0,
          }}>
            Personalizar panel
          </h3>
          <button
            type="button"
            onClick={reset}
            style={{
              all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: '#0071e3', fontWeight: 500,
            }}
            aria-label="Restablecer visibilidad por defecto"
          >
            <RotateCcw size={12} strokeWidth={2.2} aria-hidden="true" />
            Restablecer
          </button>
        </div>
        <p style={{
          margin: '0 0 18px', fontSize: 13, color: '#707070', lineHeight: 1.45,
        }}>
          Elige qué widgets quieres ver en tu panel. Tu elección se guarda en este dispositivo.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {WIDGETS.map((w) => {
            const visible = !hidden.includes(w.key);
            return (
              <li key={w.key}>
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 14,
                    background: '#f5f5f7', border: '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e8e8ed';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggle(w.key)}
                    aria-label={`${w.label}: ${visible ? 'visible' : 'oculto'}`}
                    style={{ width: 18, height: 18, accentColor: '#0071e3', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>
                      {w.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#707070', marginTop: 2 }}>
                      {w.description}
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <button type="button" className="pill-dark" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
