import { create } from 'zustand';
import type { VehicleWithAccess } from '../types';

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
}

export const useVehicleStore = create<VehicleState>((set) => ({
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
}));
