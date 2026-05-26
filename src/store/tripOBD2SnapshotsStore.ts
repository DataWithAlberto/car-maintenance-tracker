import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TripOBD2Snapshot } from '../types';

interface TripOBD2SnapshotsState {
  /** Snapshots por viaje. Cada viaje puede tener uno por etiqueta (start, midpoint, end). */
  byTrip: Record<string, TripOBD2Snapshot[]>;
  /** Captura un snapshot. Si ya existe uno con la misma etiqueta, lo sustituye. */
  capture: (tripId: string, snapshot: TripOBD2Snapshot) => void;
  /** Elimina todos los snapshots de un viaje. */
  clear: (tripId: string) => void;
  /** Devuelve el snapshot con la etiqueta dada (start por defecto). */
  getLatest: (tripId: string, label?: TripOBD2Snapshot['label']) => TripOBD2Snapshot | null;
}

export const useTripOBD2SnapshotsStore = create<TripOBD2SnapshotsState>()(
  persist(
    (set, get) => ({
      byTrip: {},
      capture: (tripId, snapshot) =>
        set((state) => {
          const existing = state.byTrip[tripId] ?? [];
          const withoutLabel = snapshot.label
            ? existing.filter((s) => s.label !== snapshot.label)
            : existing;
          return {
            byTrip: {
              ...state.byTrip,
              [tripId]: [...withoutLabel, snapshot].sort((a, b) =>
                a.captured_at.localeCompare(b.captured_at),
              ),
            },
          };
        }),
      clear: (tripId) =>
        set((state) => {
          const next = { ...state.byTrip };
          delete next[tripId];
          return { byTrip: next };
        }),
      getLatest: (tripId, label = 'start') => {
        const list = get().byTrip[tripId];
        if (!list || list.length === 0) return null;
        const filtered = list.filter((s) => s.label === label);
        const target = filtered.length > 0 ? filtered : list;
        return target[target.length - 1] ?? null;
      },
    }),
    { name: 'fh-trip-obd2-snapshots' },
  ),
);
