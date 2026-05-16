import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MechanicRating {
  rating: number;       // 1-5
  note: string;
  visits: string[];     // ISO date strings
  savedAt: string;
}

interface MechanicRatingsState {
  ratings: Record<string, MechanicRating>;
  setRating: (mechanicId: string, rating: Omit<MechanicRating, 'savedAt'>) => void;
  addVisit: (mechanicId: string) => void;
  removeRating: (mechanicId: string) => void;
}

export const useMechanicRatingsStore = create<MechanicRatingsState>()(
  persist(
    (set) => ({
      ratings: {},
      setRating: (mechanicId, data) =>
        set((s) => ({
          ratings: {
            ...s.ratings,
            [mechanicId]: { ...data, savedAt: new Date().toISOString() },
          },
        })),
      addVisit: (mechanicId) =>
        set((s) => {
          const existing = s.ratings[mechanicId];
          return {
            ratings: {
              ...s.ratings,
              [mechanicId]: {
                rating: existing?.rating ?? 0,
                note: existing?.note ?? '',
                visits: [...(existing?.visits ?? []), new Date().toISOString()],
                savedAt: new Date().toISOString(),
              },
            },
          };
        }),
      removeRating: (mechanicId) =>
        set((s) => {
          const { [mechanicId]: _, ...rest } = s.ratings;
          return { ratings: rest };
        }),
    }),
    { name: 'fh-mechanic-ratings' },
  ),
);
