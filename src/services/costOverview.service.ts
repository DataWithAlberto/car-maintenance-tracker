import type {
  Expense,
  MaintenanceRecord,
  InsurancePolicy,
  PrestamoMovimiento,
  InsurancePaymentFrequency,
} from '../types';
import { IMPORTE_INICIAL } from './prestamo.service';

/**
 * Agregador de "coste total del vehículo". Cruza las cuatro fuentes de coste
 * que ya viven en la app —gastos, mantenimiento, seguro y préstamo— en una
 * única visión de coste de propiedad. Es lógica pura (no toca Supabase): la
 * página le pasa los datos ya cargados.
 *
 * Doble conteo: el mantenimiento se toma de `maintenance_records` y el seguro
 * de `insurance_policies`; por eso se EXCLUYEN las categorías de gasto
 * "Mantenimiento" y "Seguro", que son el reflejo manual de esos módulos.
 */

export type CostPeriod = 'historico' | '12meses' | 'anio';

export type CostCategoryKey = 'financiacion' | 'combustible' | 'mantenimiento' | 'seguro' | 'otros';

export interface CostSlice {
  key: CostCategoryKey;
  label: string;
  amount: number;
  color: string;
  /** Porcentaje del total (0–100). */
  pct: number;
  /** Texto auxiliar bajo el importe (p. ej. "14 servicios"). */
  detail: string;
}

export interface CostMonth {
  key: string;
  label: string;
  total: number;
}

export interface CostOverview {
  total: number;
  slices: CostSlice[];
  monthly: CostMonth[];
  /** Coste por km (solo en histórico; el odómetro es de toda la vida del coche). */
  costPerKm: number | null;
  avgPerMonth: number;
  monthsCount: number;
  pendingLoan: number;
  topSlice: CostSlice | null;
  maxMonth: CostMonth | null;
  forecast: CostForecast;
}

export interface CostForecastItem {
  key: CostCategoryKey;
  label: string;
  amount: number;
  detail: string;
  confidence: 'alta' | 'media' | 'baja';
  color: string;
}

export interface CostForecast {
  totalNext12: number;
  avgPerMonth: number;
  items: CostForecastItem[];
  headline: string;
}

export interface CostInputs {
  expenses: Expense[];
  maintenance: MaintenanceRecord[];
  insurance: InsurancePolicy[];
  prestamo: PrestamoMovimiento[];
  currentKm: number;
}

const COLORS: Record<CostCategoryKey, string> = {
  financiacion: '#5e5ce6',
  combustible: '#0a84ff',
  mantenimiento: '#ff9500',
  seguro: '#1a9e3f',
  otros: '#707070',
};

const LABELS: Record<CostCategoryKey, string> = {
  financiacion: 'Financiación',
  combustible: 'Combustible',
  mantenimiento: 'Mantenimiento',
  seguro: 'Seguro',
  otros: 'ITV · multas · otros',
};

const PERIODS_PER_YEAR: Record<InsurancePaymentFrequency, number> = {
  mensual: 12,
  trimestral: 4,
  semestral: 2,
  anual: 1,
};

// Categorías de gasto que NO se suman a "otros" porque tienen módulo propio.
const EXCLUDED_EXPENSE_CATEGORIES = new Set(['Mantenimiento', 'Seguro']);

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * (365.25 / 12);

const startOfMonth = (y: number, m: number) => new Date(y, m, 1);

/** Ventana temporal [from, to) según el periodo elegido. */
const windowFor = (period: CostPeriod, now = new Date()): { from: Date; to: Date } => {
  if (period === '12meses') {
    return { from: startOfMonth(now.getFullYear(), now.getMonth() - 11), to: now };
  }
  if (period === 'anio') {
    return { from: startOfMonth(now.getFullYear(), 0), to: now };
  }
  return { from: new Date(0), to: now };
};

const inWindow = (iso: string, from: Date, to: Date): boolean => {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

/** Coste de seguro prorrateado: prima anualizada × meses de cobertura en la ventana. */
const annualPremium = (p: InsurancePolicy): number => {
  if (p.premium_amount == null) return 0;
  return p.premium_amount * (PERIODS_PER_YEAR[p.payment_frequency ?? 'anual'] ?? 1);
};

const insuranceCostInWindow = (policies: InsurancePolicy[], from: Date, to: Date): number => {
  let total = 0;
  for (const p of policies) {
    const annual = annualPremium(p);
    if (annual <= 0) continue;
    const ps = new Date(p.start_date).getTime();
    const pe = new Date(p.end_date).getTime();
    const oStart = Math.max(ps, from.getTime());
    const oEnd = Math.min(pe, to.getTime());
    const months = (oEnd - oStart) / MS_PER_MONTH;
    if (months > 0) total += annual * (months / 12);
  }
  return total;
};

/** Coste de seguro imputable a un mes concreto (prima anual / 12 si la póliza cubre ese mes). */
const insuranceCostForMonth = (policies: InsurancePolicy[], y: number, m: number): number => {
  const mStart = startOfMonth(y, m).getTime();
  const mEnd = startOfMonth(y, m + 1).getTime();
  let total = 0;
  for (const p of policies) {
    const annual = annualPremium(p);
    if (annual <= 0) continue;
    const ps = new Date(p.start_date).getTime();
    const pe = new Date(p.end_date).getTime();
    if (ps < mEnd && pe >= mStart) total += annual / 12;
  }
  return total;
};

const last12Window = (now: Date): { from: Date; to: Date } => ({
  from: startOfMonth(now.getFullYear(), now.getMonth() - 11),
  to: now,
});

const plannedMaintenanceCost = (
  maintenance: MaintenanceRecord[],
  currentKm: number,
  now: Date,
): { amount: number; count: number; confidence: 'media' | 'baja' } => {
  const inNextYear = new Date(now);
  inNextYear.setFullYear(inNextYear.getFullYear() + 1);

  let amount = 0;
  let count = 0;
  for (const r of maintenance) {
    const dueByKm =
      currentKm > 0 && r.next_service_km != null && r.next_service_km <= currentKm + 15000;
    const dueByDate =
      r.next_service_date != null &&
      new Date(r.next_service_date).getTime() <= inNextYear.getTime();
    if (!dueByKm && !dueByDate) continue;
    count += 1;
    amount += r.cost && r.cost > 0 ? r.cost : 180;
  }

  return { amount, count, confidence: count > 0 ? 'media' : 'baja' };
};

const buildForecast = (
  inputs: CostInputs,
  pendingLoan: number,
  now: Date,
): CostForecast => {
  const { expenses, maintenance, insurance, prestamo, currentKm } = inputs;
  const { from, to } = last12Window(now);

  let fuelLast12 = 0;
  let otherLast12 = 0;
  const monthsWithFuel = new Set<string>();
  const monthsWithOther = new Set<string>();
  const keyFor = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };

  for (const e of expenses) {
    if (!inWindow(e.date, from, to)) continue;
    if (e.category === 'Combustible') {
      fuelLast12 += e.amount;
      monthsWithFuel.add(keyFor(e.date));
    } else if (!EXCLUDED_EXPENSE_CATEGORIES.has(e.category)) {
      otherLast12 += e.amount;
      monthsWithOther.add(keyFor(e.date));
    }
  }

  const recentLoanPayments = prestamo
    .filter((m) => !m.deleted_at && inWindow(m.fecha, from, to))
    .map((m) => m.importe);
  const avgLoanPayment =
    recentLoanPayments.length > 0
      ? recentLoanPayments.reduce((s, v) => s + v, 0) / recentLoanPayments.length
      : 0;
  const loanNext12 = pendingLoan > 0 ? Math.min(pendingLoan, avgLoanPayment * 12) : 0;
  const insuranceNext12 = insuranceCostInWindow(
    insurance,
    now,
    new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
  );
  const maintenancePlan = plannedMaintenanceCost(maintenance, currentKm, now);
  const maintenanceFallback =
    maintenance
      .filter((r) => inWindow(r.date, from, to))
      .reduce((sum, r) => sum + (r.cost ?? 0), 0) * 0.9;
  const maintenanceNext12 =
    maintenancePlan.amount > 0 ? maintenancePlan.amount : Math.round(maintenanceFallback);

  const forecastItems: CostForecastItem[] = [
    {
      key: 'financiacion',
      label: LABELS.financiacion,
      amount: loanNext12,
      detail:
        pendingLoan > 0
          ? `${recentLoanPayments.length || 0} pagos recientes como base`
          : 'préstamo liquidado',
      confidence: recentLoanPayments.length >= 3 ? 'alta' : 'baja',
      color: COLORS.financiacion,
    },
    {
      key: 'combustible',
      label: LABELS.combustible,
      amount: fuelLast12,
      detail: `${monthsWithFuel.size} meses con repostajes`,
      confidence: monthsWithFuel.size >= 6 ? 'alta' : monthsWithFuel.size >= 3 ? 'media' : 'baja',
      color: COLORS.combustible,
    },
    {
      key: 'mantenimiento',
      label: LABELS.mantenimiento,
      amount: maintenanceNext12,
      detail:
        maintenancePlan.count > 0
          ? `${maintenancePlan.count} servicio${maintenancePlan.count > 1 ? 's' : ''} próximo${maintenancePlan.count > 1 ? 's' : ''}`
          : 'estimado por histórico reciente',
      confidence: maintenancePlan.count > 0 ? maintenancePlan.confidence : 'baja',
      color: COLORS.mantenimiento,
    },
    {
      key: 'seguro',
      label: LABELS.seguro,
      amount: insuranceNext12,
      detail: insurance.length > 0 ? 'prima anualizada' : 'sin póliza activa registrada',
      confidence: insurance.length > 0 ? 'alta' : 'baja',
      color: COLORS.seguro,
    },
    {
      key: 'otros',
      label: LABELS.otros,
      amount: otherLast12,
      detail: `${monthsWithOther.size} meses con gastos varios`,
      confidence: monthsWithOther.size >= 4 ? 'media' : 'baja',
      color: COLORS.otros,
    },
  ];

  const raw = forecastItems
    .filter((item) => item.amount > 0)
    .map((item) => ({ ...item, amount: Math.round(item.amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);

  const totalNext12 = raw.reduce((sum, item) => sum + item.amount, 0);
  const headline =
    raw.length === 0
      ? 'Registra costes para generar una previsión'
      : `La mayor presión prevista será ${raw[0].label.toLowerCase()}`;

  return {
    totalNext12,
    avgPerMonth: totalNext12 / 12,
    items: raw,
    headline,
  };
};

export const costOverviewService = {
  compute(inputs: CostInputs, period: CostPeriod, now = new Date()): CostOverview {
    const { expenses, maintenance, insurance, prestamo, currentKm } = inputs;
    const { from, to } = windowFor(period, now);

    // --- Importes por partida dentro de la ventana ---
    let combustible = 0;
    let otros = 0;
    for (const e of expenses) {
      if (!inWindow(e.date, from, to)) continue;
      if (e.category === 'Combustible') combustible += e.amount;
      else if (!EXCLUDED_EXPENSE_CATEGORIES.has(e.category)) otros += e.amount;
    }

    let mantenimiento = 0;
    let serviciosCount = 0;
    for (const r of maintenance) {
      if (!inWindow(r.date, from, to)) continue;
      mantenimiento += r.cost ?? 0;
      serviciosCount += 1;
    }

    let financiacion = 0;
    let pagosCount = 0;
    for (const m of prestamo) {
      if (m.deleted_at) continue;
      if (!inWindow(m.fecha, from, to)) continue;
      financiacion += m.importe;
      pagosCount += 1;
    }
    const totalPagado = prestamo.reduce((s, m) => s + (m.deleted_at ? 0 : m.importe), 0);

    const seguro = insuranceCostInWindow(insurance, from, to);

    const raw: { key: CostCategoryKey; amount: number; detail: string }[] = [
      { key: 'financiacion', amount: financiacion, detail: `${pagosCount} pagos del préstamo` },
      { key: 'combustible', amount: combustible, detail: 'repostajes' },
      { key: 'mantenimiento', amount: mantenimiento, detail: `${serviciosCount} servicios` },
      { key: 'seguro', amount: seguro, detail: 'prima prorrateada' },
      { key: 'otros', amount: otros, detail: 'ITV, multas, parking…' },
    ];

    const total = raw.reduce((s, r) => s + r.amount, 0);

    const slices: CostSlice[] = raw
      .filter((r) => r.amount > 0)
      .map((r) => ({
        key: r.key,
        label: LABELS[r.key],
        amount: r.amount,
        color: COLORS[r.key],
        pct: total > 0 ? (r.amount / total) * 100 : 0,
        detail: r.detail,
      }))
      .sort((a, b) => b.amount - a.amount);

    // --- Desglose mensual (siempre últimos 12 meses) ---
    const monthly: CostMonth[] = Array.from({ length: 12 }, (_, i) => {
      const d = startOfMonth(now.getFullYear(), now.getMonth() - (11 - i));
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase(),
        total: 0,
      };
    });
    const byKey = new Map(monthly.map((b) => [b.key, b]));
    const monthKey = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    for (const e of expenses) {
      if (EXCLUDED_EXPENSE_CATEGORIES.has(e.category)) continue;
      const b = byKey.get(monthKey(e.date));
      if (b) b.total += e.amount;
    }
    for (const r of maintenance) {
      const b = byKey.get(monthKey(r.date));
      if (b) b.total += r.cost ?? 0;
    }
    for (const m of prestamo) {
      if (m.deleted_at) continue;
      const b = byKey.get(monthKey(m.fecha));
      if (b) b.total += m.importe;
    }
    for (const b of monthly) {
      const [y, mm] = b.key.split('-').map(Number);
      b.total += insuranceCostForMonth(insurance, y, mm - 1);
    }

    // --- KPIs derivados ---
    let monthsCount: number;
    if (period === '12meses') {
      monthsCount = 12;
    } else if (period === 'anio') {
      monthsCount = now.getMonth() + 1;
    } else {
      // histórico: desde la transacción más antigua hasta hoy.
      let earliest = now.getTime();
      const consider = (iso: string) => {
        const t = new Date(iso).getTime();
        if (t < earliest) earliest = t;
      };
      expenses.forEach((e) => consider(e.date));
      maintenance.forEach((r) => consider(r.date));
      prestamo.forEach((m) => !m.deleted_at && consider(m.fecha));
      const months = (now.getTime() - earliest) / MS_PER_MONTH;
      monthsCount = Math.max(1, Math.round(months));
    }

    const pendingLoan = Math.max(0, IMPORTE_INICIAL - totalPagado);

    const maxMonth = monthly.reduce<CostMonth | null>(
      (best, m) => (best == null || m.total > best.total ? m : best),
      null,
    );

    const forecast = buildForecast(inputs, pendingLoan, now);

    return {
      total,
      slices,
      monthly,
      costPerKm: period === 'historico' && currentKm > 0 ? total / currentKm : null,
      avgPerMonth: monthsCount > 0 ? total / monthsCount : 0,
      monthsCount,
      pendingLoan,
      topSlice: slices[0] ?? null,
      maxMonth: maxMonth && maxMonth.total > 0 ? maxMonth : null,
      forecast,
    };
  },
};
