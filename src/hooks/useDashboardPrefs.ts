import { useCallback, useEffect, useState } from 'react';

// Persisted dashboard widget visibility — localStorage-backed.
// Defaults: every widget visible. Toggle from the "Personalizar panel" menu.

export type DashboardWidget =
  | 'kilometraje'
  | 'mantenimiento'
  | 'gastos'
  | 'flota';

const STORAGE_KEY = 'fh.dashboardPrefs.v1';

interface Prefs {
  hidden: DashboardWidget[];
}

const readInitial = (): Prefs => {
  if (typeof window === 'undefined') return { hidden: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hidden: [] };
    const parsed = JSON.parse(raw) as Prefs;
    if (!Array.isArray(parsed.hidden)) return { hidden: [] };
    return { hidden: parsed.hidden };
  } catch {
    return { hidden: [] };
  }
};

export const useDashboardPrefs = () => {
  const [prefs, setPrefs] = useState<Prefs>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* quota or privacy mode — ignore */
    }
  }, [prefs]);

  const isVisible = useCallback(
    (w: DashboardWidget) => !prefs.hidden.includes(w),
    [prefs.hidden],
  );

  const toggle = useCallback((w: DashboardWidget) => {
    setPrefs((p) => ({
      hidden: p.hidden.includes(w)
        ? p.hidden.filter((x) => x !== w)
        : [...p.hidden, w],
    }));
  }, []);

  const reset = useCallback(() => setPrefs({ hidden: [] }), []);

  return { isVisible, toggle, reset, hidden: prefs.hidden };
};
