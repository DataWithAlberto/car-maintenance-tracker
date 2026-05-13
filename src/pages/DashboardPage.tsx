import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
  Plus, AlertTriangle, CheckCircle2, ArrowRight, Calendar, Fuel,
  Wrench, Receipt, Route, SlidersHorizontal,
} from 'lucide-react';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { useDashboardPrefs } from '../hooks/useDashboardPrefs';
import type { DashboardWidget } from '../hooks/useDashboardPrefs';
import { useAnalytics } from '../hooks/useAnalytics';
import { useNow } from '../hooks/useNow';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { HeroCta } from '../components/dashboard/HeroCta';
import { MetricStrip } from '../components/dashboard/MetricStrip';
import { CustomizePanel } from '../components/dashboard/CustomizePanel';
import { WidgetLoading, WidgetEmpty, WidgetError } from '../components/dashboard/WidgetStates';
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
  errors: { records: boolean; expenses: boolean; trips: boolean };
}

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { track } = useAnalytics();

  const { vehicles, loading, fetchVehicles, createVehicle } = useVehicle();
  const { setSelectedVehicle: storeSet } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [stats, setStats] = useState<Record<string, VehicleStats>>({});
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const now = useNow(60_000);

  const {
    isVisible, toggle, reorder, reset, hidden, order,
  } = useDashboardPrefs();

  const statsLoading = vehicles.length > 0
    && vehicles.some((v) => !stats[v.id]);

  // Track dashboard view once per mount
  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    track('dashboard_view');
  }, [track]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  // Per-vehicle stats fetch with cancellation on unmount / vehicle change.
  // Each service call gets its own AbortSignal so a partial fail (e.g. trips
  // service) doesn't abort the others, and an unmount cancels everything.
  useEffect(() => {
    if (vehicles.length === 0) return;
    const controller = new AbortController();
    let cancelled = false;

    Promise.all(
      vehicles.map(async (v) => {
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
      if (cancelled) return;
      const map: Record<string, VehicleStats> = {};
      results.forEach((r) => { map[r.id] = r.data; });
      setStats(map);
      setLoadedAt(new Date());
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
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
    const nowMs = Date.now();
    const future = primaryStats.records
      .filter((r) => r.next_service_date && new Date(r.next_service_date).getTime() > nowMs)
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
    ? t('dashboard.maintenance.healthCopyExcellent')
    : healthScore >= 70
      ? t('dashboard.maintenance.healthCopyGood')
      : t('dashboard.maintenance.healthCopyNeedsAttention');

  const healthDetail = healthScore >= 85
    ? t('dashboard.maintenance.healthDetailExcellent')
    : healthScore >= 70
      ? t('dashboard.maintenance.healthDetailGood')
      : t('dashboard.maintenance.healthDetailNeedsAttention');

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

  const thisMonthKm = useMemo(() => {
    if (!primaryStats) return 0;
    const today = new Date();
    return primaryStats.trips
      .filter((tr) => {
        const d = new Date(tr.start_datetime);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      })
      .reduce((s, tr) => s + (tr.total_km ?? 0), 0);
  }, [primaryStats]);

  const { pctVsAvg, moreOrLess } = useMemo(() => {
    if (!primaryStats || primaryStats.trips.length === 0) {
      return { pctVsAvg: 0, moreOrLess: 'less' as const };
    }
    const totalTripKm = primaryStats.trips.reduce((s, tr) => s + (tr.total_km ?? 0), 0);
    const first = primaryStats.trips[primaryStats.trips.length - 1];
    const firstDate = new Date(first.start_datetime);
    const monthsActive = Math.max(
      1,
      (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );
    const monthlyAvg = totalTripKm / monthsActive;
    if (monthlyAvg === 0) return { pctVsAvg: 0, moreOrLess: 'less' as const };
    const ratio = thisMonthKm / monthlyAvg;
    const pct = Math.round(Math.abs(1 - ratio) * 100);
    return {
      pctVsAvg: pct,
      moreOrLess: (ratio >= 1 ? 'more' : 'less') as 'more' | 'less',
    };
  }, [primaryStats, thisMonthKm]);

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

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) ?? '';
    const fromName = full.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    return (user?.email ?? '').split('@')[0] || 'piloto';
  }, [user]);

  // Live "actualizado hace N min" — recomputes whenever `now` ticks.
  const lastSyncLabel = useMemo(() => {
    if (!loadedAt) return t('dashboard.hero.syncUpdating');
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000);
    if (mins < 1) return t('dashboard.hero.syncNow');
    if (mins < 60) return t('dashboard.hero.syncMin', { count: mins });
    return t('dashboard.hero.syncHour', { count: Math.floor(mins / 60) });
  }, [loadedAt, now, t]);

  // ─── Hero CTA — context-aware ─────────────────────────────────────────────
  const heroCta = useMemo(() => {
    if (!primary) {
      return {
        kind: 'add_vehicle',
        label: t('dashboard.cta.addVehicle'),
        icon: Plus,
        action: () => { setShowForm(true); track('dashboard_cta_click', { cta: 'add_vehicle' }); },
      };
    }
    if (primaryStats?.alerts.length || nextMaintenance) {
      return {
        kind: 'schedule_maintenance',
        label: t('dashboard.cta.scheduleMaintenance'),
        icon: Wrench,
        action: () => { navigate('/maintenance'); track('dashboard_cta_click', { cta: 'schedule_maintenance' }); },
      };
    }
    if (primaryStats && primaryStats.expenses.length === 0) {
      return {
        kind: 'first_expense',
        label: t('dashboard.cta.logFirstExpense'),
        icon: Receipt,
        action: () => { navigate('/expenses'); track('dashboard_cta_click', { cta: 'first_expense' }); },
      };
    }
    if (primaryStats && primaryStats.trips.length === 0) {
      return {
        kind: 'log_trip',
        label: t('dashboard.cta.logTrip'),
        icon: Route,
        action: () => { navigate('/trips'); track('dashboard_cta_click', { cta: 'log_trip' }); },
      };
    }
    return {
      kind: 'schedule_maintenance',
      label: t('dashboard.cta.scheduleMaintenance'),
      icon: Wrench,
      action: () => { navigate('/maintenance'); track('dashboard_cta_click', { cta: 'schedule_maintenance' }); },
    };
  }, [primary, primaryStats, nextMaintenance, navigate, t, track]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    setShowForm(true);
    track('dashboard_add_vehicle');
  }, [track]);

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
    track('dashboard_vehicle_open', { vehicleId: primary.id, primary: true });
    storeSet(primary);
    navigate('/car');
  };

  const openVehicle = (v: VehicleWithAccess) => {
    track('dashboard_vehicle_open', { vehicleId: v.id, primary: v.id === primary?.id });
    storeSet(v);
    navigate('/car');
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const heroSubtitle = !primary ? (
    t('dashboard.hero.subtitleEmpty')
  ) : nextMaintenance ? (
    <Trans
      i18nKey="dashboard.hero.subtitleNeedsMaintenance"
      values={{
        brand: primary.brand,
        model: primary.model,
        health: healthCopy,
        next: nextMaintenance.label,
        km: fmtN(nextMaintenance.kmRemaining),
      }}
      components={{ strong: <strong style={{ color: '#fff', fontWeight: 600 }} /> }}
    />
  ) : (
    t('dashboard.hero.subtitleHealthy', {
      brand: primary.brand,
      model: primary.model,
      health: healthCopy,
    })
  );

  const directionLabel = moreOrLess === 'more' ? t('dashboard.km.more') : t('dashboard.km.less');

  // Build ordered/visible widget sections — single source of truth.
  const widgets: Record<DashboardWidget, ReactElement | null> = {
    kilometraje: !primary ? null : (
      <SectionKilometraje
        primary={primary}
        primaryStats={primaryStats}
        statsLoading={statsLoading}
        dailyKm={dailyKm}
        axisDates={axisDates}
        sumWindow={sumWindow}
        avgPerDay={avgPerDay}
        thisMonthKm={thisMonthKm}
        pctVsAvg={pctVsAvg}
        directionLabel={directionLabel}
        onTrips={() => { navigate('/trips'); track('dashboard_widget_action', { widget: 'kilometraje', action: 'log_trip' }); }}
        onAllTrips={() => { navigate('/trips'); track('dashboard_widget_action', { widget: 'kilometraje', action: 'all_trips' }); }}
        onRetry={() => fetchVehicles()}
      />
    ),
    mantenimiento: !primary ? null : (
      <SectionMaintenance
        primary={primary}
        nextMaintenance={nextMaintenance}
        nextAppointment={nextAppointment}
        healthScore={healthScore}
        healthDetail={healthDetail}
        onSchedule={() => { navigate('/maintenance'); track('dashboard_widget_action', { widget: 'mantenimiento', action: 'schedule' }); }}
        onBreakdown={openPrimary}
        onShop={() => { navigate('/maintenance'); track('dashboard_widget_action', { widget: 'mantenimiento', action: 'view_appointment' }); }}
      />
    ),
    gastos: !primary ? null : (
      <SectionExpenses
        primaryStats={primaryStats}
        expensesByCat={expensesByCat}
        totalYtdPrimary={totalYtdPrimary}
        year={aggregate.year}
        onAdd={() => { navigate('/expenses'); track('dashboard_widget_action', { widget: 'gastos', action: 'add' }); }}
        onDetail={() => { navigate('/expenses'); track('dashboard_widget_action', { widget: 'gastos', action: 'detail' }); }}
      />
    ),
    flota: !primary ? null : (
      <SectionFleet
        vehicles={vehicles}
        stats={stats}
        primary={primary}
        onSelect={openVehicle}
        onAdd={handleAdd}
      />
    ),
  };

  const HeroCtaIcon = heroCta.icon;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ background: '#f5f5f7', minHeight: '100%' }}>
      {/* ═══ BLOCK 1 · INDIGO HERO ═══════════════════════════════════════════ */}
      <section className="hero-shell" aria-labelledby="hero-greeting">
        <span
          className="mono"
          style={{
            position: 'absolute', left: 18, top: 14, fontSize: 10,
            letterSpacing: '0.1em', color: 'rgba(255,255,255,0.85)',
          }}
          aria-hidden="true"
        >{t('dashboard.hero.code')}</span>
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
              }}>{t('dashboard.hero.systemActive')}</span>
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
              {t('dashboard.hero.greeting', { name: firstName })}
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

          <MetricStrip
            ariaLabel={t('dashboard.kpi.totalKm') + ', ' + t('dashboard.kpi.maintenanceRecords')}
            metrics={[
              { label: t('dashboard.kpi.totalKm'),             value: fmtN(aggregate.totalKm),         caption: t('dashboard.kpi.fleet') },
              { label: t('dashboard.kpi.maintenanceRecords'),  value: String(aggregate.totalRecords),  caption: t('dashboard.kpi.history') },
              { label: t('dashboard.kpi.spent', { year: aggregate.year }), value: fmtEur(aggregate.totalSpent), caption: t('dashboard.kpi.yearCurrent') },
              { label: t('dashboard.kpi.alerts'),              value: String(aggregate.totalAlerts),   caption: t('dashboard.kpi.alertsHint') },
            ]}
          />
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
              onClick={() => { setShowCustomize(true); track('dashboard_customize_open'); }}
              aria-label={t('dashboard.hero.customizeAria')}
              style={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: '#fff', background: 'rgba(255,255,255,0.10)',
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={2.2} aria-hidden="true" />
              {t('dashboard.hero.customize')}
            </button>
            <HeroCta label={heroCta.label} icon={HeroCtaIcon} onClick={heroCta.action} />
          </div>

          <VehicleRender />

          {primary && (
            <button
              type="button"
              onClick={openPrimary}
              className="focus-on-dark"
              aria-label={t('dashboard.hero.openVehicleAria', {
                brand: primary.brand, model: primary.model,
              })}
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
                  {' · '}
                  {t(`dashboard.role.${primary.role}`, { defaultValue: primary.role })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {primaryStats && primaryStats.alerts.length > 0 && (
                  <span
                    role="status"
                    aria-label={t('dashboard.alerts.pending', { count: primaryStats.alerts.length })}
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
                    {t('dashboard.alerts.count', { count: primaryStats.alerts.length })}
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
              .gastos-row {
                display: flex; justify-content: space-between; align-items: flex-end;
                border-top: 1px solid #e8e8ed; padding-top: 36px;
                flex-wrap: wrap; gap: 32px;
              }
              .gastos-meta {
                display: flex; gap: 32px; align-items: flex-end; flex-wrap: wrap;
              }
            `}</style>
            {order
              .filter((w) => isVisible(w))
              .map((w) => (
                <div key={w} data-widget={w}>{widgets[w]}</div>
              ))}
          </>
        )}
      </div>

      {showForm && (
        <VehicleForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}

      {showCustomize && (
        <CustomizePanel
          hidden={hidden}
          order={order}
          toggle={toggle}
          reorder={reorder}
          reset={reset}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </div>
  );
};

// ─── Section: Kilometraje ───────────────────────────────────────────────────
interface KmProps {
  primary: VehicleWithAccess;
  primaryStats: VehicleStats | undefined;
  statsLoading: boolean;
  dailyKm: number[];
  axisDates: string[];
  sumWindow: number;
  avgPerDay: number;
  thisMonthKm: number;
  pctVsAvg: number;
  directionLabel: string;
  onTrips: () => void;
  onAllTrips: () => void;
  onRetry: () => void;
}
const SectionKilometraje = ({
  primary, primaryStats, statsLoading, dailyKm, axisDates,
  sumWindow, avgPerDay, thisMonthKm, pctVsAvg, directionLabel,
  onTrips, onAllTrips, onRetry,
}: KmProps) => {
  const { t } = useTranslation();
  return (
    <section
      className="editorial-grid-2"
      aria-labelledby="km-title"
      data-testid="widget-kilometraje"
    >
      <div>
        <span className="eyebrow">
          {primary.model}
          {primary.license_plate ? ` · ${primary.license_plate}` : ''}
        </span>
        <h2 id="km-title" className="display-xxl" style={{ marginTop: 12 }}>
          {fmtN(primary.current_km)}<br />
          <span style={{ color: '#707070' }}>{t('dashboard.km.title')}</span>
        </h2>
        <p className="body-soft" style={{ maxWidth: 480, margin: '24px 0 0' }}>
          {t('dashboard.km.thisMonth', { count: Number(fmtN(thisMonthKm).replace(/\s/g, '')) })}{' '}
          {pctVsAvg > 0
            ? t('dashboard.km.vsAverage', { pct: pctVsAvg, direction: directionLabel })
            : t('dashboard.km.notEnoughData')}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button type="button" className="pill-dark" onClick={onTrips}>
            <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
            {t('dashboard.km.logTrip')}
          </button>
          <button type="button" className="pill-ghost" onClick={onAllTrips}>
            {t('dashboard.km.seeAllTrips')}
          </button>
        </div>
      </div>

      <div className="card" style={{
        padding: 32, background: '#fff',
        borderRadius: 20, border: '1px solid #e8e8ed',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow">{t('dashboard.km.use30d')}</span>
          <span className="mono" style={{ fontSize: 11, color: '#707070' }}>
            {t('dashboard.km.perDay', { value: avgPerDay.toFixed(1).replace('.', ',') })}
          </span>
        </div>
        <div style={{ marginTop: 20 }}>
          {primaryStats?.errors.trips ? (
            <WidgetError
              onRetry={onRetry}
              message={t('dashboard.km.errorLoading')}
              retryLabel={t('common.retry')}
            />
          ) : statsLoading && !primaryStats ? (
            <WidgetLoading height={120} />
          ) : sumWindow === 0 ? (
            <WidgetEmpty
              icon={Route}
              message={t('dashboard.km.noTrips30d')}
              ctaLabel={t('dashboard.km.logTrip')}
              onCta={onTrips}
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
  );
};

// ─── Section: Maintenance ──────────────────────────────────────────────────
interface MaintProps {
  primary: VehicleWithAccess;
  nextMaintenance: { label: string; kmRemaining: number } | null;
  nextAppointment: { dayLabel: string; time: string; type: string } | null;
  healthScore: number;
  healthDetail: string;
  onSchedule: () => void;
  onBreakdown: () => void;
  onShop: () => void;
}
const SectionMaintenance = ({
  primary, nextMaintenance, nextAppointment, healthScore, healthDetail,
  onSchedule, onBreakdown, onShop,
}: MaintProps) => {
  const { t } = useTranslation();
  return (
    <section
      className="editorial-grid-3"
      aria-label={t('dashboard.maintenance.health')}
      data-testid="widget-mantenimiento"
    >
      {/* Card A — Critical alert */}
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
          {t('dashboard.maintenance.criticalAlert')}
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
              ? t('dashboard.maintenance.untilNext', { label: nextMaintenance.label })
              : t('dashboard.maintenance.noneVisible')}
          </p>
        </div>
        <button type="button" className="pill-dark" onClick={onSchedule}>
          <Wrench size={14} strokeWidth={2.2} aria-hidden="true" />
          {nextMaintenance ? t('dashboard.maintenance.schedule') : t('dashboard.maintenance.add')}
          <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      {/* Card B — Health */}
      <div className="card-fog" style={{
        background: '#f5f5f7', borderRadius: 20,
        padding: 28, minHeight: 280,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <span className="eyebrow">{t('dashboard.maintenance.health')}</span>
        <div>
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={healthScore}
            aria-label={t('dashboard.maintenance.healthMeterAria', { value: healthScore })}
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
            {t('dashboard.maintenance.healthOver100', { detail: healthDetail })}
          </p>
        </div>
        <button type="button" className="pill-ghost" onClick={onBreakdown}>
          {t('dashboard.maintenance.seeBreakdown')}
        </button>
      </div>

      {/* Card C — Next shop */}
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
          {t('dashboard.maintenance.nextShop')}
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
                {t('dashboard.maintenance.noAppointment')}
              </div>
              <p style={{
                fontFamily: 'Inter, var(--font-sf-pro-text)',
                fontWeight: 400, fontSize: 15, lineHeight: 1.45,
                color: 'rgba(255,255,255,0.78)', margin: '12px 0 0',
              }}>
                {t('dashboard.maintenance.addDateToBook')}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          className="pill focus-on-dark"
          onClick={onShop}
          style={{ background: '#fff', color: '#000', alignSelf: 'flex-start' }}
        >
          {nextAppointment ? t('dashboard.maintenance.seeAppointment') : t('dashboard.maintenance.schedule')}
          <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};

// ─── Section: Expenses ─────────────────────────────────────────────────────
interface ExpProps {
  primaryStats: VehicleStats | undefined;
  expensesByCat: { combustible: number; mantenimiento: number; seguro: number };
  totalYtdPrimary: number;
  year: number;
  onAdd: () => void;
  onDetail: () => void;
}
const SectionExpenses = ({
  primaryStats, expensesByCat, totalYtdPrimary, year, onAdd, onDetail,
}: ExpProps) => {
  const { t } = useTranslation();
  return (
    <section
      className="gastos-row"
      style={{ marginBottom: 80 }}
      aria-labelledby="gastos-title"
      data-testid="widget-gastos"
    >
      <div>
        <span className="eyebrow">{t('dashboard.expenses.ytd', { year })}</span>
        <h2 id="gastos-title" className="display-xl" style={{ marginTop: 10 }}>
          {primaryStats?.errors.expenses ? (
            <span style={{ color: '#b64400', fontSize: 24 }}>{t('dashboard.expenses.errorLoading')}</span>
          ) : (
            <>{fmtN(totalYtdPrimary)} <span style={{ color: '#707070' }}>€</span></>
          )}
        </h2>
      </div>
      <div className="gastos-meta">
        {[
          [t('dashboard.expenses.fuel'),        expensesByCat.combustible,   Fuel],
          [t('dashboard.expenses.maintenance'), expensesByCat.mantenimiento, Wrench],
          [t('dashboard.expenses.insurance'),   expensesByCat.seguro,        Receipt],
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
          <button type="button" className="pill-dark" onClick={onAdd}>
            <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
            {t('dashboard.expenses.addExpense')}
          </button>
          <button type="button" className="pill" onClick={onDetail}>
            {t('dashboard.expenses.detail')}
            <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── Section: Fleet ────────────────────────────────────────────────────────
interface FleetProps {
  vehicles: VehicleWithAccess[];
  stats: Record<string, VehicleStats>;
  primary: VehicleWithAccess | null;
  onSelect: (v: VehicleWithAccess) => void;
  onAdd: () => void;
}
const SectionFleet = ({ vehicles, stats, primary, onSelect, onAdd }: FleetProps) => {
  const { t } = useTranslation();
  return (
    <section
      style={{ borderTop: '1px solid #e8e8ed', paddingTop: 36 }}
      aria-labelledby="flota-title"
      data-testid="widget-flota"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <span id="flota-title" className="eyebrow">
          {t('dashboard.fleet.title', { count: vehicles.length })}
        </span>
        <span className="mono" style={{ fontSize: 11, color: '#707070' }}>
          {t('dashboard.fleet.clickToOpen')}
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
            onSelect={() => onSelect(v)}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          aria-label={t('dashboard.fleet.addAnother')}
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
          {t('dashboard.fleet.addAnother')}
        </button>
      </div>
    </section>
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
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  </div>
);

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
  const { t } = useTranslation();
  const alertCount = stats?.alerts.length ?? 0;
  const recordCount = stats?.records.length ?? 0;
  const hasError = stats?.errors && (stats.errors.records || stats.errors.expenses || stats.errors.trips);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${t('common.open')} ${vehicle.brand} ${vehicle.model}`}
      data-testid="fleet-card"
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
              aria-label={t('dashboard.alerts.pending', { count: alertCount })}
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
              aria-label={t('dashboard.alerts.none')}
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
            <div style={{ fontSize: 11, color: '#707070', marginBottom: 4 }}>
              {t('dashboard.fleet.kmLabel')}
            </div>
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
            <div style={{ fontSize: 11, color: '#707070', marginBottom: 4 }}>
              {t('dashboard.fleet.maintenanceLabel')}
            </div>
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
          ? t('dashboard.fleet.partialDataError')
          : isPrimary
            ? t('dashboard.fleet.primary')
            : t('dashboard.fleet.selectHint')}
      </div>
    </button>
  );
};

const EditorialEmpty = ({ onAdd }: { onAdd: () => void }) => {
  const { t } = useTranslation();
  return (
    <div
      data-testid="dashboard-empty"
      style={{
        padding: '40px 0', display: 'flex', flexDirection: 'column',
        gap: 20, maxWidth: 640,
      }}
    >
      <span className="eyebrow">{t('dashboard.empty.eyebrow')}</span>
      <h2 className="display-lg">
        {t('dashboard.empty.title')}<br />
        <span style={{ color: '#707070' }}>{t('dashboard.empty.subtitle')}</span>
      </h2>
      <p className="body-soft" style={{ maxWidth: 520, margin: 0 }}>
        {t('dashboard.empty.body')}
      </p>
      <button
        type="button"
        className="pill-dark"
        onClick={onAdd}
        style={{ alignSelf: 'flex-start', marginTop: 8 }}
      >
        <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
        {t('dashboard.cta.addVehicle')}
      </button>
    </div>
  );
};
