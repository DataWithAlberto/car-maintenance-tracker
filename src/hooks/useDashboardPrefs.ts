import { useCallback, useEffect, useMemo, useState } from 'react';

// Persisted dashboard widget visibility + order — localStorage-backed.
// Bump STORAGE_KEY when the schema changes.

export type DashboardWidget =
  | 'kilometraje'
  | 'mantenimiento'
  | 'gastos'
  | 'flota';

const STORAGE_KEY = 'fh.dashboardPrefs.v2';

const DEFAULT_ORDER: DashboardWidget[] = [
  'kilometraje',
  'mantenimiento',
  'gastos',
  'flota',
];

interface Prefs {
  hidden: DashboardWidget[];
  order: DashboardWidget[];
}

const sanitizeOrder = (raw: unknown): DashboardWidget[] => {
  if (!Array.isArray(raw)) return [...DEFAULT_ORDER];
  const valid = raw.filter(
    (x): x is DashboardWidget =>
      typeof x === 'string' && (DEFAULT_ORDER as string[]).includes(x),
  );
  const seen = new Set<DashboardWidget>(valid);
  // Append any widgets the user has never seen (forward compat: new widgets
  // ship visible at the end of the list rather than being silently dropped).
  return [
    ...valid,
    ...DEFAULT_ORDER.filter((w) => !seen.has(w)),
  ];
};

const readInitial = (): Prefs => {
  if (typeof window === 'undefined') {
    return { hidden: [], order: [...DEFAULT_ORDER] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hidden: [], order: [...DEFAULT_ORDER] };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      order: sanitizeOrder(parsed.order),
    };
  } catch {
    return { hidden: [], order: [...DEFAULT_ORDER] };
  }
};

export const useDashboardPrefs = () => {
  const [prefs, setPrefs] = useState<Prefs>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* quota / private mode */
    }
  }, [prefs]);

  const isVisible = useCallback(
    (w: DashboardWidget) => !prefs.hidden.includes(w),
    [prefs.hidden],
  );

  const toggle = useCallback((w: DashboardWidget) => {
    setPrefs((p) => ({
      ...p,
      hidden: p.hidden.includes(w)
        ? p.hidden.filter((x) => x !== w)
        : [...p.hidden, w],
    }));
  }, []);

  const reorder = useCallback((next: DashboardWidget[]) => {
    setPrefs((p) => ({ ...p, order: sanitizeOrder(next) }));
  }, []);

  const reset = useCallback(
    () => setPrefs({ hidden: [], order: [...DEFAULT_ORDER] }),
    [],
  );

  const orderedVisible = useMemo(
    () => prefs.order.filter((w) => !prefs.hidden.includes(w)),
    [prefs.order, prefs.hidden],
  );

  return {
    isVisible,
    toggle,
    reorder,
    reset,
    hidden: prefs.hidden,
    order: prefs.order,
    orderedVisible,
  };
};

export { DEFAULT_ORDER };
