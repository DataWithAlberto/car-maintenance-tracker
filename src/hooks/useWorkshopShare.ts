import { useState } from 'react';
import toast from 'react-hot-toast';
import { vehicleService } from '../services/vehicle.service';
import { useVehicleStore } from '../store/vehicleStore';
import type { VehicleWithAccess } from '../types';

// Gestiona el enlace de "modo taller" de un vehículo: alta, baja y copia
// del token de solo lectura.
export const useWorkshopShare = (vehicle: VehicleWithAccess | null) => {
  const updateVehicleStore = useVehicleStore((s) => s.updateVehicle);
  const [shareBusy, setShareBusy] = useState(false);

  const shareUrl = vehicle?.share_token
    ? `${window.location.origin}/taller/${vehicle.share_token}`
    : null;

  const generateShare = async () => {
    if (!vehicle) return;
    setShareBusy(true);
    try {
      const token = await vehicleService.setShareToken(vehicle.id);
      updateVehicleStore(vehicle.id, { share_token: token });
      toast.success('Enlace de taller generado');
    } catch {
      toast.error('No se pudo generar el enlace');
    } finally {
      setShareBusy(false);
    }
  };

  const disableShare = async () => {
    if (!vehicle) return;
    setShareBusy(true);
    try {
      await vehicleService.clearShareToken(vehicle.id);
      updateVehicleStore(vehicle.id, { share_token: null });
      toast.success('Acceso de taller desactivado');
    } catch {
      toast.error('No se pudo desactivar el acceso');
    } finally {
      setShareBusy(false);
    }
  };

  const copyShare = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => toast.success('Enlace copiado'));
    }
  };

  return { shareUrl, shareBusy, generateShare, disableShare, copyShare };
};
