import { useState, useCallback } from 'react';
import { tripBookingsService } from '../services/tripBookings.service';
import type { TripBooking, CreateTripBookingInput } from '../types';

export const useTripBookings = (tripId?: string) => {
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tripBookingsService.getByTrip(tripId);
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const createBooking = useCallback(
    async (userId: string, input: CreateTripBookingInput): Promise<TripBooking> => {
      if (!tripId) throw new Error('No trip selected');
      const booking = await tripBookingsService.create(tripId, userId, input);
      setBookings((prev) =>
        [...prev, booking].sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)),
      );
      return booking;
    },
    [tripId],
  );

  const updateBooking = useCallback(
    async (id: string, input: Partial<CreateTripBookingInput>): Promise<void> => {
      const updated = await tripBookingsService.update(id, input);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    },
    [],
  );

  const deleteBooking = useCallback(async (id: string): Promise<void> => {
    await tripBookingsService.delete(id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { bookings, loading, error, fetchBookings, createBooking, updateBooking, deleteBooking };
};
