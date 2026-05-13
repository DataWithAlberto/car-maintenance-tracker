import { useEffect, useState } from 'react';

// Returns a Date that updates on a fixed interval — used to keep
// time-based labels ("hace 5 min") fresh without forcing parents to
// re-render on every animation frame.
export const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
};
