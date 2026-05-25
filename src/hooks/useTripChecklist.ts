import { useState, useCallback } from 'react';
import { tripChecklistService } from '../services/tripChecklist.service';
import type { TripChecklistItem } from '../types';

export const useTripChecklist = (tripId?: string) => {
  const [items, setItems] = useState<TripChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tripChecklistService.getByTrip(tripId);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar checklist');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const addItem = useCallback(
    async (userId: string, text: string): Promise<void> => {
      if (!tripId) throw new Error('No trip selected');
      const next = await tripChecklistService.create(tripId, userId, text, items.length);
      setItems((prev) => [...prev, next]);
    },
    [tripId, items.length],
  );

  const toggleItem = useCallback(async (id: string, done: boolean): Promise<void> => {
    await tripChecklistService.toggle(id, done);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done } : i)));
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    await tripChecklistService.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, error, fetchItems, addItem, toggleItem, deleteItem };
};
