import { useCallback } from 'react';
import { useVehicleStore } from '../store/vehicleStore';
import { vehicleService } from '../services/vehicle.service';
import { useAuthStore } from '../store/authStore';
import type { VehicleInput } from '../utils/validators';

export const useVehicle = () => {
  const store = useVehicleStore();
  const { user } = useAuthStore();

  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    store.setLoading(true);
    try {
      const vehicles = await vehicleService.getAll(user.id);
      store.setVehicles(vehicles);
    } finally {
      store.setLoading(false);
    }
  }, [user]);

  const createVehicle = async (input: VehicleInput) => {
    if (!user) throw new Error('Not authenticated');
    const v = await vehicleService.create(user.id, input);
    store.addVehicle({ ...v, role: 'owner' });
    return v;
  };

  const updateVehicle = async (id: string, input: Partial<VehicleInput>) => {
    const v = await vehicleService.update(id, input);
    store.updateVehicle(id, v);
    return v;
  };

  const deleteVehicle = async (id: string) => {
    await vehicleService.delete(id);
    store.removeVehicle(id);
  };

  return {
    ...store,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  };
};
