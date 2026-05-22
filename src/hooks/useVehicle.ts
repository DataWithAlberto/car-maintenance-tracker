import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useVehicleStore } from '../store/vehicleStore';
import { vehicleService } from '../services/vehicle.service';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../utils/errors';
import type { VehicleInput } from '../utils/validators';

export const useVehicle = () => {
  // Selectores individuales: cada acción de zustand tiene una referencia
  // estable, por lo que los callbacks que dependen de ellas no se recrean
  // en cada render.
  const vehicles = useVehicleStore((s) => s.vehicles);
  const selectedVehicle = useVehicleStore((s) => s.selectedVehicle);
  const loading = useVehicleStore((s) => s.loading);
  const error = useVehicleStore((s) => s.error);
  const setVehicles = useVehicleStore((s) => s.setVehicles);
  const setLoading = useVehicleStore((s) => s.setLoading);
  const setError = useVehicleStore((s) => s.setError);
  const addVehicleToStore = useVehicleStore((s) => s.addVehicle);
  const updateVehicleInStore = useVehicleStore((s) => s.updateVehicle);
  const removeVehicleFromStore = useVehicleStore((s) => s.removeVehicle);
  const userId = useAuthStore((s) => s.user?.id);

  const fetchVehicles = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await vehicleService.getAll(userId);
      setVehicles(data);
    } catch (err) {
      const msg = getErrorMessage(err, 'No se pudieron cargar los vehículos');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, setLoading, setError, setVehicles]);

  const createVehicle = async (input: VehicleInput) => {
    if (!userId) throw new Error('Not authenticated');
    const v = await vehicleService.create(userId, input);
    addVehicleToStore({ ...v, role: 'owner' });
    return v;
  };

  const updateVehicle = async (id: string, input: Partial<VehicleInput>) => {
    const v = await vehicleService.update(id, input);
    updateVehicleInStore(id, v);
    return v;
  };

  const deleteVehicle = async (id: string) => {
    await vehicleService.delete(id);
    removeVehicleFromStore(id);
  };

  return {
    vehicles,
    selectedVehicle,
    loading,
    error,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  };
};
