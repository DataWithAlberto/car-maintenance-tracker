import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_VEHICLE_THRESHOLDS, type VehicleThresholds } from '../types';

interface OBD2ThresholdsState {
  /** Mapa vehicleId → overrides. Solo se almacenan claves que difieren del default. */
  byVehicle: Record<string, Partial<VehicleThresholds>>;
  getFor: (vehicleId: string | null | undefined) => VehicleThresholds;
  setFor: (vehicleId: string, patch: Partial<VehicleThresholds>) => void;
  resetFor: (vehicleId: string) => void;
}

const mergeWithDefaults = (partial: Partial<VehicleThresholds> | undefined): VehicleThresholds => ({
  ...DEFAULT_VEHICLE_THRESHOLDS,
  ...(partial ?? {}),
});

export const useOBD2ThresholdsStore = create<OBD2ThresholdsState>()(
  persist(
    (set, get) => ({
      byVehicle: {},
      getFor: (vehicleId) => {
        if (!vehicleId) return DEFAULT_VEHICLE_THRESHOLDS;
        return mergeWithDefaults(get().byVehicle[vehicleId]);
      },
      setFor: (vehicleId, patch) =>
        set((state) => ({
          byVehicle: {
            ...state.byVehicle,
            [vehicleId]: { ...(state.byVehicle[vehicleId] ?? {}), ...patch },
          },
        })),
      resetFor: (vehicleId) =>
        set((state) => {
          const next = { ...state.byVehicle };
          delete next[vehicleId];
          return { byVehicle: next };
        }),
    }),
    { name: 'fh-obd2-thresholds' },
  ),
);
