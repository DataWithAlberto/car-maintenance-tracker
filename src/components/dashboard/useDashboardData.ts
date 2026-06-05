import { useEffect, useMemo, useState } from 'react';
import { useVehicle } from '../../hooks/useVehicle';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { maintenanceService } from '../../services/maintenance.service';
import { expensesService } from '../../services/expenses.service';
import { tripsService } from '../../services/trips.service';
import { documentsService } from '../../services/documents.service';
import { calculateAlerts, calculateDocumentAlerts } from '../../utils/calculations';
import { sendAlertNotifications } from '../../utils/notifications';
import { OIL_CHANGE_KM_INTERVAL } from '../../utils/constants';
import { fmtMonthDay } from './format';
import type {
  VehicleWithAccess,
  MaintenanceRecord,
  Expense,
  Trip,
  Alert,
  Document,
} from '../../types';

/** Telemetría agregada de un vehículo (registros + derivados de alertas). */
export interface VehicleStats {
  vehicle: VehicleWithAccess;
  records: MaintenanceRecord[];
  expenses: Expense[];
  trips: Trip[];
  documents: Document[];
  alerts: Alert[];
}

export interface NextMaintenance {
  label: string;
  kmRemaining: number;
  intervalKm: number;
}

export interface NextAppointment {
  dayLabel: string;
  time: string;
  type: string;
}

export interface TripStats {
  dailyKm: number[];
  axisDates: [string, string, string];
  thisMonthKm: number;
  pctVsAvg: number;
  moreOrLess: 'más' | 'menos';
  avgPerDay: number;
}

export interface ExpenseBreakdown {
  combustible: number;
  mantenimiento: number;
  seguro: number;
}

export interface DashboardData {
  vehicles: VehicleWithAccess[];
  loading: boolean;
  statsLoading: boolean;
  stats: Record<string, VehicleStats>;
  primary: VehicleWithAccess | null;
  primaryStats: VehicleStats | undefined;
  aggregate: {
    totalKm: number;
    totalRecords: number;
    totalSpentYtd: number;
    totalAlerts: number;
    ytd: number;
  };
  nextMaintenance: NextMaintenance | null;
  nextAppointment: NextAppointment | null;
  healthScore: number;
  healthCopy: string;
  healthDetail: string;
  /** Alertas de severidad alta + servicios vencidos → alimentan el banner rojo. */
  criticalCount: number;
  overdueCount: number;
  tripStats: TripStats;
  expensesByCat: ExpenseBreakdown;
  totalYtdPrimary: number;
  firstName: string;
  lastSyncLabel: string;
  fetchVehicles: () => void;
  createVehicle: ReturnType<typeof useVehicle>['createVehicle'];
}

/**
 * Concentra todo el data layer del dashboard: fetch de vehículos + estadísticas
 * por vehículo, derivaciones memoizadas en una sola pasada y el tick de sync.
 * Mantiene la página de presentación limpia y testeable.
 */
export const useDashboardData = (): DashboardData => {
  const { vehicles, loading, fetchVehicles, createVehicle } = useVehicle();
  const { user } = useAuthStore();
  const { pushEnabled } = useSettingsStore();

  const [stats, setStats] = useState<Record<string, VehicleStats>>({});
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

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
        void sendAlertNotifications(results.flatMap((r) => r.data.alerts));
      }
    });
  }, [vehicles, pushEnabled]);

  // Vehículo principal = primer propietario, si no el primero disponible.
  const primary = useMemo(
    () => vehicles.find((v) => v.role === 'owner') ?? vehicles[0] ?? null,
    [vehicles],
  );
  const primaryStats = primary ? stats[primary.id] : undefined;
  const statsLoading = loading || (vehicles.length > 0 && !loadedAt);

  // ─── Agregados de flota (una sola pasada) ───────────────────────────────────
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

  // ─── Próximo mantenimiento (vehículo principal) ─────────────────────────────
  const nextMaintenance = useMemo<NextMaintenance | null>(() => {
    if (!primary || !primaryStats) return null;
    const candidates: NextMaintenance[] = [];
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

  // ─── Próxima cita en taller (vehículo principal) ────────────────────────────
  const nextAppointment = useMemo<NextAppointment | null>(() => {
    if (!primaryStats) return null;
    const nowMs = loadedAt ? loadedAt.getTime() : 0;
    let future: MaintenanceRecord | null = null;
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

  // ─── Salud general (0-100) ──────────────────────────────────────────────────
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

  // ─── Urgencia (banner rojo) ─────────────────────────────────────────────────
  const { criticalCount, overdueCount } = useMemo(() => {
    if (!primary || !primaryStats) return { criticalCount: 0, overdueCount: 0 };
    const critical = primaryStats.alerts.filter((a) => a.severity === 'high').length;
    let overdue = 0;
    for (const r of primaryStats.records) {
      if (r.next_service_km && r.next_service_km <= primary.current_km) overdue += 1;
    }
    return { criticalCount: critical, overdueCount: overdue };
  }, [primary, primaryStats]);

  // ─── Estadísticas de viajes (una sola pasada O(N)) ──────────────────────────
  const tripStats = useMemo<TripStats>(() => {
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

    const trips = (primaryStats?.trips ?? []).filter((t) => !t.is_surprise);
    for (const t of trips) {
      if (!t.start_datetime) continue;
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

  // ─── Desglose de gasto YTD (vehículo principal) ─────────────────────────────
  const expensesByCat = useMemo<ExpenseBreakdown>(() => {
    const cats: ExpenseBreakdown = { combustible: 0, mantenimiento: 0, seguro: 0 };
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

  // ─── Nombre + copy de sync ──────────────────────────────────────────────────
  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) ?? '';
    const fromName = full.trim().split(/\s+/)[0];
    if (fromName) return fromName;
    return (user?.email ?? '').split('@')[0] || 'piloto';
  }, [user]);

  // Tick reactivo cada 60s: Date.now() vive solo dentro del setInterval, nunca
  // dentro del useMemo (que debe ser puro).
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
    if (minsSinceSync < 60) return `${minsSinceSync}m`;
    return `${Math.floor(minsSinceSync / 60)}h`;
  }, [loadedAt, minsSinceSync]);

  return {
    vehicles,
    loading,
    statsLoading,
    stats,
    primary,
    primaryStats,
    aggregate,
    nextMaintenance,
    nextAppointment,
    healthScore,
    healthCopy,
    healthDetail,
    criticalCount,
    overdueCount,
    tripStats,
    expensesByCat,
    totalYtdPrimary,
    firstName,
    lastSyncLabel,
    fetchVehicles,
    createVehicle,
  };
};
