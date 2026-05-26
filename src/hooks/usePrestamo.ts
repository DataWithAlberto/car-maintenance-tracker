import { useState, useEffect, useMemo } from 'react';
import { prestamoService } from '../services/prestamo.service';
import type { PrestamoMovimiento } from '../types';
import toast from 'react-hot-toast';

export function usePrestamo(vehicleId?: string) {
  const [movimientos, setMovimientos] = useState<PrestamoMovimiento[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const data = await prestamoService.getByVehicle(vehicleId);
      setMovimientos(data);
    } catch {
      toast.error('Error al cargar los movimientos del préstamo');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    refresh();
  }, [vehicleId]);

  const stats = useMemo(() => prestamoService.calcStats(movimientos), [movimientos]);

  const create = async (input: {
    fecha: string;
    importe: number;
    usuario: string;
    descripcion?: string;
  }) => {
    if (!vehicleId) return;
    const m = await prestamoService.create(vehicleId, input);
    setMovimientos((prev) => [m, ...prev]);
    return m;
  };

  const remove = async (id: string) => {
    const snapshot = movimientos;
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    try {
      await prestamoService.delete(id);
    } catch {
      setMovimientos(snapshot);
      throw new Error('No se pudo eliminar el movimiento');
    }
  };

  return { movimientos, stats, loading, create, remove, refresh };
}
