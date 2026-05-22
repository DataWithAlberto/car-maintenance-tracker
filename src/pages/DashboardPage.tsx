import { useEffect, useState, useMemo, Suspense, lazy, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { maintenanceService } from '../services/maintenance.service';
import { expensesService } from '../services/expenses.service';
import { tripsService } from '../services/trips.service';
import { documentsService } from '../services/documents.service';
import { calculateAlerts, calculateDocumentAlerts } from '../utils/calculations';
import { sendAlertNotifications } from '../utils/notifications';
import { getErrorMessage } from '../utils/errors';
import { useSettingsStore } from '../store/settingsStore';
import { OIL_CHANGE_KM_INTERVAL } from '../utils/constants';
import type {
  VehicleWithAccess,
  MaintenanceRecord,
  Expense,
  Trip,
  Alert,
  Document,
} from '../types';
import toast from 'react-hot-toast';

// Visor 3D — carga diferida: mantiene el bundle de Three.js fuera del chunk
// inicial del dashboard.
const FordFocusModel3D = lazy(() =>
  import('../components/3d/FordFocusModel3D').then((m) => ({ default: m.FordFocusModel3D })),
);

// ─── Locale-safe formatting (es-ES with space thousands separator) ──────────
const fmtN = (n: number) => Math.round(n).toLocaleString('es-ES').replace(/\./g, ' ');
const fmtEur = (n: number) => `${fmtN(n)} €`;
const fmtMonthDay = (d: Date) =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();

interface VehicleStats {
  vehicle: VehicleWithAccess;
  records: MaintenanceRecord[];
  expenses: Expense[];
  trips: Trip[];
  documents: Document[];
  alerts: Alert[];
}

export const DashboardPage = () => {
  const { vehicles, loading, fetchVehicles, createVehicle } = useVehicle();
  const { setSelectedVehicle: storeSet } = useVehicleStore();
  const { user } = useAuthStore();
  const { pushEnabled } = useSettingsStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<Record<string, VehicleStats>>({});
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  // Visor 3D — montaje diferido hasta que la sección entra en viewport,
  // así el chunk de Three.js no penaliza el TTI inicial del dashboard.
  const viewer3dRef = useRef<HTMLDivElement>(null);
  const [viewer3dInView, setViewer3dInView] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    const el = viewer3dRef.current;
    if (!el || viewer3dInView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setViewer3dInView(true);
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [viewer3dInView]);

  useEffect(() => {
    if (vehicles.length === 0) return;
    Promise.all(
      vehicles.map(async (v) => {
        const [records, expenses, trips, documents] = await Promise.all([
          maintenanceService.getByVehicle(v.id).catch(() => []),
          expensesService.getByVehicle(v.id).catch(() => []),
          tripsService.getByVehicle(v.id).catch(() => []),
          documentsService.getByVehicle(v.id).catch(() => []),
        ]);
        return {
          id: v.id,
          data: {
            vehicle: v,
            records,
            expenses,
            trips,
            documents,
            alerts: [
              ...calculateAlerts(v, records),
              ...calculateDocumentAlerts(v.id, documents),
            ].filter((a) => !a.is_dismissed),
          } satisfies VehicleStats,
        };
      }),
    ).then((results) => {
      const map: Record<string, VehicleStats> = {};
      results.forEach((r) => {
        map[r.id] = r.data;
      });
      setStats(map);
      setLoadedAt(new Date());
      if (pushEnabled) {
        sendAlertNotifications(results.flatMap((r) => r.data.alerts));
      }
    });
  }, [vehicles, pushEnabled]);

  // Primary vehicle = first owned, else first available
  const primary = useMemo(
    () => vehicles.find((v) => v.role === 'owner') ?? vehicles[0] ?? null,
    [vehicles],
  );
  const primaryStats = primary ? stats[primary.id] : undefined;
  const statsLoading = loading || (vehicles.length > 0 && !loadedAt);

  // ─── Aggregates (fleet-wide) ──────────────────────────────────────────────
  // Una sola pasada por vehicles, lookup directo en stats por ID. Elimina
  // el Set + Object.entries + filter + map intermedios, y los 4 filter()
  // anidados (uno por gasto y otro por registro) se funden en un único
  // bucle sin allocations.
  const aggregate = useMemo(() => {
    const ytd = new Date().getFullYear();
    let totalKm = 0;
    let totalRecords = 0;
    let totalSpentYtd = 0;
    let totalAlerts = 0;
    for (const v of vehicles) {
      totalKm += v.current_km;
      const s = stats[v.id];
      if (!s) continue;
      totalRecords += s.records.length;
      totalAlerts += s.alerts.length;
      for (const e of s.expenses) {
        if (new Date(e.date).getFullYear() === ytd) totalSpentYtd += e.amount;
      }
      for (const r of s.records) {
        if (new Date(r.date).getFullYear() === ytd) totalSpentYtd += r.cost ?? 0;
      }
    }
    return { totalKm, totalRecords, totalSpentYtd, totalAlerts, ytd };
  }, [stats, vehicles]);

  // ─── Per-primary-vehicle derived data ─────────────────────────────────────
  const nextMaintenance = useMemo(() => {
    if (!primary || !primaryStats) return null;
    const candidates: { label: string; kmRemaining: number; intervalKm: number }[] = [];
    primaryStats.records.forEach((r) => {
      if (r.next_service_km && r.next_service_km > primary.current_km) {
        candidates.push({
          label: r.type.toLowerCase(),
          kmRemaining: r.next_service_km - primary.current_km,
          intervalKm: Math.max(1, r.next_service_km - r.km_at_service),
        });
      }
    });
    const lastOil = primaryStats.records
      .filter((r) => r.type === 'Cambio de aceite')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (lastOil) {
      const rem = OIL_CHANGE_KM_INTERVAL - (primary.current_km - lastOil.km_at_service);
      if (rem > 0)
        candidates.push({
          label: 'cambio de aceite',
          kmRemaining: rem,
          intervalKm: OIL_CHANGE_KM_INTERVAL,
        });
    }
    candidates.sort((a, b) => a.kmRemaining - b.kmRemaining);
    return candidates[0] ?? null;
  }, [primary, primaryStats]);

  const nextAppointment = useMemo(() => {
    if (!primaryStats) return null;
    // Usa loadedAt (snapshot estable del momento de carga) en lugar de
    // Date.now() para no leer reloj dentro de useMemo. Además, una sola
    // pasada — el patrón anterior creaba 3 arrays intermedios (filter →
    // sort → [0]).
    const nowMs = loadedAt ? loadedAt.getTime() : 0;
    let future: (typeof primaryStats.records)[number] | null = null;
    let futureMs = Infinity;
    for (const r of primaryStats.records) {
      if (!r.next_service_date) continue;
      const t = new Date(r.next_service_date).getTime();
      if (t > nowMs && t < futureMs) {
        future = r;
        futureMs = t;
      }
    }
    if (!future) return null;
    const d = new Date(future.next_service_date!);
    const dayLabel = d
      .toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' })
      .replace('.', '');
    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return { dayLabel, time, type: future.type };
  }, [primaryStats, loadedAt]);

  const healthScore = useMemo(() => {
    if (!primaryStats) return 100;
    const penalty = primaryStats.alerts.reduce((s, a) => {
      if (a.severity === 'high') return s + 15;
      if (a.severity === 'medium') return s + 8;
      return s + 3;
    }, 0);
    return Math.max(30, 100 - penalty);
  }, [primaryStats]);

  const healthCopy =
    healthScore >= 85
      ? 'en óptimo estado'
      : healthScore >= 70
        ? 'en buen estado'
        : 'con mantenimiento pendiente';

  const healthDetail =
    healthScore >= 85
      ? 'Motor, frenos y suspensión dentro de parámetros.'
      : healthScore >= 70
        ? 'Sistemas principales en orden, alertas menores activas.'
        : 'Varios sistemas requieren atención. Revisa las alertas.';

  // Una sola pasada por trips: ventana de 30 días + km del mes actual +
  // total acumulado + fecha más antigua, todo en O(N). Antes eran 3 useMemos
  // independientes que recorrían el mismo array, generando arrays
  // intermedios por filter().
  const tripStats = useMemo(() => {
    const buckets: number[] = new Array(30).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const mid = new Date(start);
    mid.setDate(start.getDate() + 14);
    const startMs = start.getTime();
    const nowY = today.getFullYear();
    const nowM = today.getMonth();

    let thisMonthKm = 0;
    let totalTripKm = 0;
    let firstMs = Infinity;
    let sumWindow = 0;

    const trips = primaryStats?.trips ?? [];
    for (const t of trips) {
      const km = t.total_km ?? 0;
      totalTripKm += km;
      const d = new Date(t.start_datetime);
      const ms = d.getTime();
      if (ms < firstMs) firstMs = ms;
      if (d.getFullYear() === nowY && d.getMonth() === nowM) thisMonthKm += km;
      d.setHours(0, 0, 0, 0);
      const idx = Math.floor((d.getTime() - startMs) / 86_400_000);
      if (idx >= 0 && idx < 30) {
        buckets[idx] += km;
        sumWindow += km;
      }
    }

    let pctVsAvg = 0;
    let moreOrLess: 'más' | 'menos' = 'menos';
    if (trips.length > 0 && firstMs !== Infinity) {
      // Usa today (ya construido arriba) como referencia temporal en lugar
      // de Date.now() — evita lectura de reloj dentro de useMemo.
      const monthsActive = Math.max(1, (today.getTime() - firstMs) / (1000 * 60 * 60 * 24 * 30));
      const monthlyAvg = totalTripKm / monthsActive;
      if (monthlyAvg > 0) {
        const ratio = thisMonthKm / monthlyAvg;
        pctVsAvg = Math.round(Math.abs(1 - ratio) * 100);
        moreOrLess = ratio >= 1 ? 'más' : 'menos';
      }
    }

    return {
      dailyKm: buckets,
      axisDates: [fmtMonthDay(start), fmtMonthDay(mid), fmtMonthDay(today)],
      thisMonthKm,
      pctVsAvg,
      moreOrLess,
      avgPerDay: sumWindow / 30,
    };
  }, [primaryStats]);

  const { dailyKm, axisDates, thisMonthKm, pctVsAvg, moreOrLess, avgPerDay } = tripStats;

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
      .forEach((r) => {
        cats.mantenimiento += r.cost ?? 0;
      });
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

  // Tick reactivo: el useMemo anterior leía Date.now() sin tenerlo como
  // dependencia, así que el label se congelaba en "AHORA" para toda la
  // sesión. Mantenemos los minutos transcurridos en estado y los
  // refrescamos cada 60 s — Date.now() vive solo dentro del setInterval,
  // nunca dentro del useMemo (que debe ser puro).
  const [minsSinceSync, setMinsSinceSync] = useState(0);
  useEffect(() => {
    if (!loadedAt) {
      setMinsSinceSync(0);
      return;
    }
    const tick = () => setMinsSinceSync(Math.floor((Date.now() - loadedAt.getTime()) / 60_000));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [loadedAt]);

  const lastSyncLabel = useMemo(() => {
    if (!loadedAt) return 'AHORA';
    if (minsSinceSync < 1) return 'AHORA';
    if (minsSinceSync < 60) return `${minsSinceSync}m AGO`;
    return `${Math.floor(minsSinceSync / 60)}h AGO`;
  }, [loadedAt, minsSinceSync]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = () => setShowForm(true);

  const handleCreate = async (data: Parameters<typeof createVehicle>[0]) => {
    try {
      const v = await createVehicle(data);
      toast.success('Vehículo añadido');
      storeSet({ ...v, role: 'owner' });
      navigate('/car');
    } catch (err: unknown) {
      console.error('Error al crear vehículo:', err);
      toast.error(getErrorMessage(err, 'Error al crear vehículo'));
    }
  };

  const openPrimary = () => {
    if (!primary) return;
    storeSet(primary);
    navigate('/car');
  };

  // ─── Subtitle copy (hero) ─────────────────────────────────────────────────
  const heroSubtitle = !primary ? (
    <>
      Aún no has añadido ningún vehículo. Empieza por registrar el primero para desbloquear
      mantenimientos, gastos y alertas.
    </>
  ) : nextMaintenance ? (
    <>
      Tu {primary.brand} {primary.model} está {healthCopy}, pero conviene programar el{' '}
      {nextMaintenance.label} — quedan{' '}
      <strong style={{ color: '#fff', fontWeight: 600 }}>
        {fmtN(nextMaintenance.kmRemaining)} km
      </strong>
      .
    </>
  ) : (
    <>
      Tu {primary.brand} {primary.model} está {healthCopy}. Sin mantenimientos pendientes a la vista
      — sigue así.
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ background: 'var(--color-fog)', minHeight: '100%' }}>
      {/* ═══ BLOCK 1 · INDIGO HERO ═══════════════════════════════════════════ */}
      <section
        className="indigo-hero mx-5 md:mx-10 mt-6"
        style={{
          position: 'relative',
          color: '#fff',
          borderRadius: 28,
          overflow: 'hidden',
          background:
            'linear-gradient(184deg, rgb(29,29,31) 18%, rgb(168,211,251) 45%, rgb(0,18,249) 78%, rgb(37,53,224) 98%)',
          minHeight: 440,
          display: 'grid',
          gap: 40,
        }}
      >
        <span
          className="mono"
          style={{
            position: 'absolute',
            left: 24,
            top: 18,
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          FH · 001 / GARAGE
        </span>
        <span
          className="mono"
          style={{
            position: 'absolute',
            right: 24,
            bottom: 18,
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          SYNC · {lastSyncLabel}
        </span>

        {/* LEFT */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1,
            gap: 28,
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: 'var(--color-mint)',
                  boxShadow: '0 0 0 4px rgba(28,176,92,0.25)',
                }}
              />
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                SISTEMA ACTIVO · TU GARAJE
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 6vw, 64px)',
                lineHeight: 1.04,
                letterSpacing: '-1.4px',
                color: '#fff',
                margin: '14px 0 6px',
              }}
            >
              Hola, {firstName}.
            </h1>
            <p
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 300,
                fontSize: 20,
                lineHeight: 1.4,
                letterSpacing: '-0.2px',
                color: 'rgba(255,255,255,0.82)',
                maxWidth: 520,
                margin: 0,
              }}
            >
              {heroSubtitle}
            </p>
          </div>

          {/* Frosted KPI strip */}
          <div
            className="indigo-kpis"
            style={{
              display: 'grid',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {[
              ['KM TOTALES', fmtN(aggregate.totalKm), 'flota completa'],
              ['MANTENIMIENTOS', String(aggregate.totalRecords), 'histórico'],
              ['GASTO YTD', fmtEur(aggregate.totalSpentYtd), String(aggregate.ytd)],
              ['ALERTAS', String(aggregate.totalAlerts), 'requieren atención'],
            ].map(([l, v, s]) => (
              <div key={l} style={{ padding: '18px 22px' }}>
                <div
                  className="label"
                  style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.08em' }}
                >
                  {l}
                </div>
                {statsLoading ? (
                  <div
                    aria-hidden="true"
                    style={{
                      height: 28,
                      width: 88,
                      marginTop: 6,
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.18)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontFamily: 'Inter, var(--font-sf-pro-display)',
                      fontWeight: 700,
                      fontSize: 28,
                      lineHeight: 1,
                      letterSpacing: '-0.3px',
                      marginTop: 6,
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-text)',
                    fontWeight: 400,
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: 4,
                  }}
                >
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                  color: '#fff',
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                Ver modelo 3D
              </button>
            )}
          </div>

          <VehicleRender vehicle={primary} />

          {primary && (
            <button
              type="button"
              onClick={openPrimary}
              aria-label={`Abrir ${primary.brand} ${primary.model}`}
              className="focus-ring"
              style={{
                margin: 0,
                font: 'inherit',
                color: 'inherit',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 16,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
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
                <div
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 600,
                    fontSize: 18,
                    lineHeight: 1.1,
                    letterSpacing: '-0.2px',
                    color: '#fff',
                  }}
                >
                  {primary.brand} {primary.model}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: 6,
                    letterSpacing: '0.06em',
                  }}
                >
                  {primary.year}
                  {primary.fuel_type && ` · ${primary.fuel_type.toUpperCase()}`}
                  {primary.license_plate && ` · ${primary.license_plate}`}
                  {` · ${primary.role === 'owner' ? 'PROPIETARIO' : primary.role.toUpperCase()}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {primaryStats && primaryStats.alerts.length > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontFamily: 'Inter, var(--font-sf-pro-text)',
                      fontWeight: 600,
                      fontSize: 12,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span aria-hidden="true">⚠</span> {primaryStats.alerts.length} alerta
                    {primaryStats.alerts.length === 1 ? '' : 's'}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-text)',
                    fontSize: 18,
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  →
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* ═══ BLOCK 2 · EDITORIAL BODY ════════════════════════════════════════ */}
      <div className="dashboard-body" style={{ display: 'flex', flexDirection: 'column' }}>
        {loading && !primary ? (
          <BodySkeleton />
        ) : !primary ? (
          <EditorialEmpty onAdd={handleAdd} />
        ) : (
          <>
            {/* ── Section 1 — KILOMETRAJE ───────────────────────────────── */}
            <section className="editorial-grid-2">
              <div>
                <span className="eyebrow">
                  {primary.model}
                  {primary.license_plate ? ` · ${primary.license_plate}` : ''}
                </span>
                <h1
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700,
                    fontSize: 'clamp(56px, 9vw, 96px)',
                    lineHeight: 1,
                    letterSpacing: '-2.11px',
                    margin: '12px 0 0',
                    color: 'var(--color-ink)',
                  }}
                >
                  {fmtN(primary.current_km)}
                  <br />
                  <span style={{ color: 'var(--color-graphite)' }}>kilómetros.</span>
                </h1>
                <p
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-text)',
                    fontWeight: 300,
                    fontSize: 22,
                    lineHeight: 1.4,
                    letterSpacing: '-0.2px',
                    color: 'var(--color-slate)',
                    maxWidth: 480,
                    margin: '24px 0 0',
                  }}
                >
                  +{fmtN(thisMonthKm)} este mes.{' '}
                  {pctVsAvg > 0 ? (
                    <>
                      Conduciendo un {pctVsAvg}% {moreOrLess} que la media anual.
                    </>
                  ) : (
                    <>Aún no hay datos suficientes para comparar con la media anual.</>
                  )}
                </p>
              </div>

              <div
                className="card"
                style={{
                  padding: 32,
                  background: 'var(--color-snow)',
                  borderRadius: 20,
                  border: '1px solid var(--color-silver-mist)',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="eyebrow">Uso diario · 30 días</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--color-mist)' }}>
                    {avgPerDay.toFixed(1).replace('.', ',')} KM/DÍA
                  </span>
                </div>
                <div style={{ marginTop: 20 }}>
                  <Sparkline data={dailyKm} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-mist)',
                  }}
                >
                  {axisDates.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Section 2 — MANTENIMIENTO HIGHLIGHT ───────────────────── */}
            <section className="editorial-grid-3">
              {/* Card A — Alerta crítica */}
              <div
                className="card"
                style={{
                  background: 'var(--color-snow)',
                  borderRadius: 20,
                  border: '1px solid var(--color-silver-mist)',
                  padding: 28,
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <span className="eyebrow" style={{ color: 'var(--color-caution)' }}>
                  ● Alerta crítica
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: 'Inter, var(--font-sf-pro-display)',
                      fontWeight: 700,
                      fontSize: 56,
                      lineHeight: 1,
                      letterSpacing: '-0.9px',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {nextMaintenance ? fmtN(nextMaintenance.kmRemaining) : '—'}
                    {nextMaintenance && (
                      <span
                        style={{
                          fontFamily: 'Inter, var(--font-sf-pro-text)',
                          fontWeight: 300,
                          fontSize: 24,
                          color: 'var(--color-graphite)',
                        }}
                      >
                        {' '}
                        km
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontFamily: 'Inter, var(--font-sf-pro-text)',
                      fontWeight: 400,
                      fontSize: 17,
                      lineHeight: 1.45,
                      color: 'var(--color-ink)',
                      margin: '12px 0 0',
                    }}
                  >
                    {nextMaintenance ? (
                      <>hasta el {nextMaintenance.label} recomendado.</>
                    ) : (
                      <>sin mantenimientos pendientes a la vista.</>
                    )}
                  </p>
                  {nextMaintenance &&
                    (() => {
                      const used = nextMaintenance.intervalKm - nextMaintenance.kmRemaining;
                      const pct = Math.min(
                        100,
                        Math.max(0, (used / nextMaintenance.intervalKm) * 100),
                      );
                      const barColor =
                        pct >= 90
                          ? 'var(--color-caution)'
                          : pct >= 70
                            ? 'var(--color-warn-500)'
                            : 'var(--color-ink)';
                      return (
                        <div style={{ marginTop: 16 }}>
                          <div
                            role="progressbar"
                            aria-valuenow={Math.round(pct)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Intervalo de ${nextMaintenance.label}: ${Math.round(pct)}% completado`}
                            style={{
                              height: 6,
                              background: 'var(--color-silver-mist)',
                              borderRadius: 999,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: barColor,
                                borderRadius: 999,
                                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginTop: 6,
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              letterSpacing: '0.06em',
                              color: 'var(--color-mist)',
                            }}
                          >
                            <span>{Math.round(pct)}% DEL INTERVALO</span>
                            <span>{fmtN(nextMaintenance.intervalKm)} KM</span>
                          </div>
                        </div>
                      );
                    })()}
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
              <div
                className="card-fog"
                style={{
                  background: 'var(--color-fog)',
                  borderRadius: 20,
                  padding: 28,
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <span className="eyebrow">Salud general</span>
                <div>
                  <div
                    style={{
                      fontFamily: 'Inter, var(--font-sf-pro-display)',
                      fontWeight: 700,
                      fontSize: 'clamp(64px, 8vw, 96px)',
                      lineHeight: 1,
                      letterSpacing: '-2.11px',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {healthScore}
                  </div>
                  <p
                    style={{
                      fontFamily: 'Inter, var(--font-sf-pro-text)',
                      fontWeight: 300,
                      fontSize: 17,
                      lineHeight: 1.45,
                      color: 'var(--color-slate)',
                      margin: '4px 0 0',
                    }}
                  >
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
              <div
                style={{
                  background: '#000',
                  color: '#fff',
                  borderRadius: 20,
                  padding: 28,
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Próximo taller
                </span>
                <div>
                  {nextAppointment ? (
                    <>
                      <div
                        style={{
                          fontFamily: 'Inter, var(--font-sf-pro-display)',
                          fontWeight: 700,
                          fontSize: 32,
                          lineHeight: 1.1,
                          letterSpacing: '-0.4px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {nextAppointment.dayLabel}
                        <br />
                        {nextAppointment.time}
                      </div>
                      <p
                        style={{
                          fontFamily: 'Inter, var(--font-sf-pro-text)',
                          fontWeight: 400,
                          fontSize: 15,
                          lineHeight: 1.45,
                          color: 'rgba(255,255,255,0.7)',
                          margin: '12px 0 0',
                        }}
                      >
                        {primary.brand} {primary.model} · {nextAppointment.type}.
                      </p>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          fontFamily: 'Inter, var(--font-sf-pro-display)',
                          fontWeight: 700,
                          fontSize: 32,
                          lineHeight: 1.1,
                          letterSpacing: '-0.4px',
                        }}
                      >
                        Sin cita
                        <br />
                        programada
                      </div>
                      <p
                        style={{
                          fontFamily: 'Inter, var(--font-sf-pro-text)',
                          fontWeight: 400,
                          fontSize: 15,
                          lineHeight: 1.45,
                          color: 'rgba(255,255,255,0.7)',
                          margin: '12px 0 0',
                        }}
                      >
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
              <div>
                <span className="eyebrow">Gasto acumulado · {aggregate.ytd}</span>
                <h2
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700,
                    fontSize: 'clamp(48px, 7vw, 80px)',
                    lineHeight: 1,
                    letterSpacing: '-1.7px',
                    margin: '10px 0 0',
                    color: 'var(--color-ink)',
                  }}
                >
                  {fmtN(totalYtdPrimary)} <span style={{ color: 'var(--color-graphite)' }}>€</span>
                </h2>
              </div>
              <div className="gastos-meta">
                {[
                  ['COMBUSTIBLE', expensesByCat.combustible],
                  ['MANTENIMIENTO', expensesByCat.mantenimiento],
                  ['SEGURO', expensesByCat.seguro],
                ].map(([lbl, val]) => (
                  <div key={lbl as string}>
                    <span className="label" style={{ color: 'var(--color-graphite)' }}>
                      {lbl}
                    </span>
                    <div
                      style={{
                        fontFamily: 'Inter, var(--font-sf-pro-display)',
                        fontWeight: 600,
                        fontSize: 28,
                        lineHeight: 1,
                        color: 'var(--color-ink)',
                        marginTop: 8,
                      }}
                    >
                      {fmtEur(val as number)}
                    </div>
                  </div>
                ))}
                <button className="pill" onClick={() => navigate('/expenses')}>
                  Detalle →
                </button>
              </div>
            </section>

            {/* ── Flota registrada ──────────────────────────────────────── */}
            <section style={{ borderTop: '1px solid var(--color-silver-mist)', paddingTop: 36 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 16,
                }}
              >
                <span className="eyebrow">
                  Flota registrada · {vehicles.length} vehículo{vehicles.length === 1 ? '' : 's'}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--color-mist)' }}>
                  CLIC PARA SELECCIONAR
                </span>
              </div>
              <div
                style={{
                  marginTop: 24,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                }}
              >
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

        {/* ── Sección · Visor 3D del vehículo ───────────────────────── */}
        <div ref={viewer3dRef}>
          {viewer3dInView ? (
            <Suspense
              fallback={
                <div
                  className="skeleton"
                  style={{
                    minHeight: 'clamp(470px, 56vw, 760px)',
                    borderRadius: 28,
                    border: '1px solid var(--color-silver-mist)',
                  }}
                />
              }
            >
              <FordFocusModel3D />
            </Suspense>
          ) : (
            <div
              aria-hidden="true"
              style={{
                minHeight: 'clamp(470px, 56vw, 760px)',
                borderRadius: 28,
                border: '1px solid var(--color-silver-mist)',
                background: 'var(--color-snow)',
              }}
            />
          )}
        </div>
      </div>

      {showForm && <VehicleForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  );
};

// ─── Sparkline ──────────────────────────────────────────────────────────────
const Sparkline = ({
  data,
  width = 460,
  height = 120,
}: {
  data: number[];
  width?: number;
  height?: number;
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
      <path d={line} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
    </svg>
  );
};

// ─── Vehicle render ──────────────────────────────────────────────────────────
const VehicleRender = ({ vehicle }: { vehicle: VehicleWithAccess | null }) => (
  <div
    style={{
      width: '100%',
      maxWidth: 580,
      alignSelf: 'center',
      margin: '0 auto',
    }}
  >
    <img
      src="/ford-focus.png"
      alt={vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo de ejemplo'}
      style={{
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
        filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.4))',
      }}
    />
  </div>
);

// ─── Body skeleton — minimal, zero-shadow ───────────────────────────────────
const BodySkeleton = () => (
  <div
    style={{
      display: 'grid',
      gap: 24,
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    }}
  >
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          height: 220,
          borderRadius: 20,
          background: 'var(--color-snow)',
          border: '1px solid var(--color-silver-mist)',
        }}
        className="skeleton"
      />
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

const VehicleGridCard = ({ vehicle, stats, isPrimary, onSelect }: VehicleGridCardProps) => {
  const alertCount = stats?.alerts.length ?? 0;
  const recordCount = stats?.records.length ?? 0;

  return (
    <button
      onClick={onSelect}
      className="focus-ring"
      style={{
        margin: 0,
        font: 'inherit',
        color: 'inherit',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        background: 'var(--color-snow)',
        border: isPrimary ? '2px solid var(--color-azure)' : '1px solid var(--color-silver-mist)',
        borderRadius: 20,
        padding: 20,
        minHeight: 200,
        cursor: 'pointer',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-azure)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isPrimary
          ? 'var(--color-azure)'
          : 'var(--color-silver-mist)';
      }}
    >
      <div>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}
        >
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 600,
                fontSize: 18,
                letterSpacing: '-0.2px',
                color: 'var(--color-ink)',
                margin: '0 0 4px',
              }}
            >
              {vehicle.brand} {vehicle.model}
            </h3>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-mist)',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              {vehicle.year}
              {vehicle.fuel_type && ` · ${vehicle.fuel_type}`}
              {vehicle.license_plate && ` · ${vehicle.license_plate}`}
            </div>
          </div>
          {alertCount > 0 ? (
            <span
              aria-label={`${alertCount} alerta${alertCount === 1 ? '' : 's'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 999,
                background: 'var(--color-caution)',
                color: 'var(--color-snow)',
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden="true">⚠</span> {alertCount}
            </span>
          ) : (
            <span
              aria-label="Sin alertas"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'var(--color-mint)',
                color: 'var(--color-snow)',
                fontSize: 10,
              }}
            >
              <span aria-hidden="true">✓</span>
            </span>
          )}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-mist)', marginBottom: 4 }}>KM</div>
            <div
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 600,
                fontSize: 20,
                color: 'var(--color-ink)',
              }}
            >
              {fmtN(vehicle.current_km)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-mist)', marginBottom: 4 }}>SVC</div>
            <div
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 600,
                fontSize: 20,
                color: 'var(--color-ink)',
              }}
            >
              {recordCount}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--color-mist)',
          marginTop: 12,
        }}
      >
        {isPrimary ? '✓ Vehículo principal' : 'Haz click para seleccionar'}
      </div>
    </button>
  );
};

const EditorialEmpty = ({ onAdd }: { onAdd: () => void }) => (
  <div
    style={{
      padding: '40px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      maxWidth: 640,
    }}
  >
    <span className="eyebrow">Tu garaje · vacío</span>
    <h2
      style={{
        fontFamily: 'Inter, var(--font-sf-pro-display)',
        fontWeight: 700,
        fontSize: 'clamp(40px, 6vw, 64px)',
        lineHeight: 1.04,
        letterSpacing: '-1.4px',
        margin: 0,
        color: 'var(--color-ink)',
      }}
    >
      Empieza añadiendo
      <br />
      <span style={{ color: 'var(--color-graphite)' }}>tu primer vehículo.</span>
    </h2>
    <p
      style={{
        fontFamily: 'Inter, var(--font-sf-pro-text)',
        fontWeight: 300,
        fontSize: 20,
        lineHeight: 1.4,
        letterSpacing: '-0.2px',
        color: 'var(--color-slate)',
        maxWidth: 520,
        margin: 0,
      }}
    >
      Registra marca, modelo y kilometraje. A partir de ahí, FocusHub te avisará de mantenimientos y
      agrupará gastos y trayectos.
    </p>
    <button className="pill-dark" onClick={onAdd} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
      <Plus size={14} strokeWidth={2.2} style={{ marginRight: 2 }} />
      Añadir vehículo
    </button>
  </div>
);
