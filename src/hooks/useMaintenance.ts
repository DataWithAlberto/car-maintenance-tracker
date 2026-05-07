import { useCallback } from 'react';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { maintenanceService } from '../services/maintenance.service';
import { useAuthStore } from '../store/authStore';
import type { MaintenanceInput } from '../utils/validators';

export const useMaintenance = (vehicleId?: string) => {
  const store = useMaintenanceStore();
  const { user } = useAuthStore();

  const fetchRecords = useCallback(async () => {
    if (!vehicleId) return;
    store.setLoading(true);
    try {
      const records = await maintenanceService.getByVehicle(vehicleId);
      store.setRecords(records);
    } finally {
      store.setLoading(false);
    }
  }, [vehicleId]);

  const createRecord = async (input: MaintenanceInput) => {
    if (!vehicleId || !user) throw new Error('Missing context');
    const r = await maintenanceService.create(vehicleId, user.id, input);
    store.addRecord(r);
    return r;
  };

  const updateRecord = async (id: string, input: Partial<MaintenanceInput>) => {
    const r = await maintenanceService.update(id, input);
    store.updateRecord(id, r);
    return r;
  };

  const deleteRecord = async (id: string) => {
    await maintenanceService.delete(id);
    store.removeRecord(id);
  };

  return {
    ...store,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
