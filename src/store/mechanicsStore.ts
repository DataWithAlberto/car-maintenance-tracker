import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Mechanic, Diagnosis } from '../types';

interface MechanicsState {
  symptom: string;
  origin: { lat: number; lng: number } | null;
  mechanics: Mechanic[];
  diagnosis: Diagnosis | null;
  selectedId: string | undefined;
  setSymptom: (s: string) => void;
  setSearchResult: (data: {
    origin: { lat: number; lng: number } | null;
    mechanics: Mechanic[];
    diagnosis: Diagnosis | null;
  }) => void;
  setSelectedId: (id: string | undefined) => void;
  reset: () => void;
}

export const useMechanicsStore = create<MechanicsState>()(
  persist(
    (set) => ({
      symptom: '',
      origin: null,
      mechanics: [],
      diagnosis: null,
      selectedId: undefined,
      setSymptom: (symptom) => set({ symptom }),
      setSearchResult: ({ origin, mechanics, diagnosis }) =>
        set({ origin, mechanics, diagnosis }),
      setSelectedId: (selectedId) => set({ selectedId }),
      reset: () =>
        set({ symptom: '', origin: null, mechanics: [], diagnosis: null, selectedId: undefined }),
    }),
    { name: 'fh-mechanics-search' },
  ),
);
