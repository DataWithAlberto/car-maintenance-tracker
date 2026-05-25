import { useState, useCallback, useRef } from 'react';
import { tripActivitiesService } from '../services/tripActivities.service';
import type { TripActivity, CreateTripActivityInput } from '../types';

export const useTripActivities = (tripId?: string) => {
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<TripActivity[]>([]);

  const fetchActivities = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tripActivitiesService.getByTrip(tripId);
      setActivities(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const createActivity = useCallback(
    async (userId: string, input: CreateTripActivityInput): Promise<TripActivity> => {
      if (!tripId) throw new Error('No trip selected');
      const created = await tripActivitiesService.create(tripId, userId, input);
      setActivities((prev) =>
        [...prev, created].sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)),
      );
      return created;
    },
    [tripId],
  );

  const updateActivity = useCallback(
    async (id: string, patch: Partial<CreateTripActivityInput>): Promise<void> => {
      // Optimistic — guarda snapshot para revertir
      snapshotRef.current = activities;
      setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      try {
        const updated = await tripActivitiesService.update(id, patch);
        setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
      } catch (e) {
        setActivities(snapshotRef.current);
        throw e;
      }
    },
    [activities],
  );

  const deleteActivity = useCallback(
    async (id: string): Promise<void> => {
      snapshotRef.current = activities;
      setActivities((prev) => prev.filter((a) => a.id !== id));
      try {
        await tripActivitiesService.delete(id);
      } catch (e) {
        setActivities(snapshotRef.current);
        throw e;
      }
    },
    [activities],
  );

  return {
    activities,
    /** @deprecated usar `activities`. */
    bookings: activities,
    loading,
    error,
    fetchActivities,
    fetchBookings: fetchActivities,
    createActivity,
    createBooking: createActivity,
    updateActivity,
    deleteActivity,
    deleteBooking: deleteActivity,
  };
};

/** @deprecated alias retro-compatible. */
export const useTripBookings = useTripActivities;
