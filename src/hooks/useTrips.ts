import { useState, useCallback } from 'react';
import { tripsService } from '../services/trips.service';
import type { Trip, CreateTripInput, CreateDraftTripInput } from '../types';

export const useTrips = (vehicleId?: string) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tripsService.getByVehicle(vehicleId);
      setTrips(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar viajes');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const createTrip = useCallback(
    async (userId: string, input: CreateTripInput): Promise<Trip> => {
      if (!vehicleId) throw new Error('No vehicle selected');
      const trip = await tripsService.create(vehicleId, userId, input);
      setTrips((prev) => [{ ...trip, waypoints: [] }, ...prev]);
      return trip;
    },
    [vehicleId],
  );

  const updateTrip = useCallback(async (id: string, input: Partial<Trip>): Promise<void> => {
    const updated = await tripsService.update(id, input);
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
  }, []);

  const deleteTrip = useCallback(async (id: string): Promise<void> => {
    // Optimistic: quita el viaje, restaura si falla
    let snapshot: Trip[] = [];
    setTrips((prev) => {
      snapshot = prev;
      return prev.filter((t) => t.id !== id);
    });
    try {
      await tripsService.delete(id);
    } catch (e) {
      setTrips(snapshot);
      throw e;
    }
  }, []);

  const createDraft = useCallback(
    async (userId: string, input: CreateDraftTripInput): Promise<Trip> => {
      if (!vehicleId) throw new Error('No vehicle selected');
      const trip = await tripsService.createDraft(vehicleId, userId, input);
      setTrips((prev) => [{ ...trip, waypoints: [] }, ...prev]);
      return trip;
    },
    [vehicleId],
  );

  const confirmTrip = useCallback(async (tripId: string, keepIds: string[]): Promise<void> => {
    const updated = await tripsService.confirmTrip(tripId, keepIds);
    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, ...updated } : t)));
  }, []);

  return {
    trips,
    loading,
    error,
    fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
    createDraft,
    confirmTrip,
  };
};
