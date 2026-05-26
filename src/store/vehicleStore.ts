import { create } from 'zustand';
import type { VehicleWithAccess } from '../types';
import { vehicleService } from '../services/vehicle.service';

interface VehicleState {
  vehicles: VehicleWithAccess[];
  selectedVehicle: VehicleWithAccess | null;
  loading: boolean;
  error: string | null;
  setVehicles: (vehicles: VehicleWithAccess[]) => void;
  setSelectedVehicle: (vehicle: VehicleWithAccess | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addVehicle: (vehicle: VehicleWithAccess) => void;
  updateVehicle: (id: string, vehicle: Partial<VehicleWithAccess>) => void;
  removeVehicle: (id: string) => void;
  /**
   * Recibe un kilometraje leído por OBD-II (PID A6) y, si supone un avance
   * real sobre el valor en memoria, actualiza el store inmediatamente y
   * persiste el cambio en Supabase en segundo plano. La actualización del
   * store basta para que `buildMaintenancePlan` y `predictFailures` —ambos
   * `useMemo`-derivados de `current_km`— recalculen en cascada el % de vida
   * útil restante de cada componente del plan predictivo.
   *
   * Idempotente: si `newMileage` no supera al kilometraje almacenado, la
   * llamada es un no-op (nunca retrocedemos el odómetro).
   */
  updateOdometerFromOBD2: (newMileage: number) => Promise<void>;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  loading: false,
  error: null,
  setVehicles: (vehicles) => set({ vehicles }),
  setSelectedVehicle: (selectedVehicle) => set({ selectedVehicle }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addVehicle: (vehicle) => set((s) => ({ vehicles: [vehicle, ...s.vehicles] })),
  updateVehicle: (id, updated) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updated } : v)),
      selectedVehicle:
        s.selectedVehicle?.id === id ? { ...s.selectedVehicle, ...updated } : s.selectedVehicle,
    })),
  removeVehicle: (id) =>
    set((s) => ({
      vehicles: s.vehicles.filter((v) => v.id !== id),
      selectedVehicle: s.selectedVehicle?.id === id ? null : s.selectedVehicle,
    })),
  updateOdometerFromOBD2: async (newMileage) => {
    const { selectedVehicle, vehicles } = get();
    if (!selectedVehicle) return;
    if (!Number.isFinite(newMileage) || newMileage <= selectedVehicle.current_km) return;

    // 1) Actualización optimista del store — dispara la cascada de useMemo.
    set({
      selectedVehicle: { ...selectedVehicle, current_km: newMileage },
      vehicles: vehicles.map((v) =>
        v.id === selectedVehicle.id ? { ...v, current_km: newMileage } : v,
      ),
    });

    // 2) Persistencia asíncrona en Supabase: fire-and-forget. Un fallo de
    // red no bloquea la UI ni revierte el valor mostrado: el siguiente
    // tick de polling lo reenviará.
    try {
      await vehicleService.update(selectedVehicle.id, { current_km: newMileage });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[vehicleStore] updateOdometerFromOBD2 persist failed:', err);
      }
    }
  },
}));
