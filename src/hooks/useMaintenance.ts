import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { maintenanceService } from '../services/maintenance.service';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../utils/errors';
import type { MaintenanceInput } from '../utils/validators';

export const useMaintenance = (vehicleId?: string) => {
  const records = useMaintenanceStore((s) => s.records);
  const loading = useMaintenanceStore((s) => s.loading);
  const error = useMaintenanceStore((s) => s.error);
  const setRecords = useMaintenanceStore((s) => s.setRecords);
  const setLoading = useMaintenanceStore((s) => s.setLoading);
  const setError = useMaintenanceStore((s) => s.setError);
  const addRecord = useMaintenanceStore((s) => s.addRecord);
  const updateRecordInStore = useMaintenanceStore((s) => s.updateRecord);
  const removeRecord = useMaintenanceStore((s) => s.removeRecord);
  const userId = useAuthStore((s) => s.user?.id);

  const fetchRecords = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await maintenanceService.getByVehicle(vehicleId);
      setRecords(data);
    } catch (err) {
      const msg = getErrorMessage(err, 'No se pudieron cargar los registros');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, setLoading, setError, setRecords]);

  const createRecord = async (input: MaintenanceInput) => {
    if (!vehicleId || !userId) throw new Error('Missing context');
    const r = await maintenanceService.create(vehicleId, userId, input);
    addRecord(r);
    return r;
  };

  const updateRecord = async (id: string, input: Partial<MaintenanceInput>) => {
    const r = await maintenanceService.update(id, input);
    updateRecordInStore(id, r);
    return r;
  };

  const deleteRecord = async (id: string) => {
    await maintenanceService.delete(id);
    removeRecord(id);
  };

  return {
    records,
    loading,
    error,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
