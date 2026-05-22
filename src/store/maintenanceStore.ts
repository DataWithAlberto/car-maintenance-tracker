import { create } from 'zustand';
import type { MaintenanceRecord } from '../types';

interface MaintenanceState {
  records: MaintenanceRecord[];
  loading: boolean;
  error: string | null;
  setRecords: (records: MaintenanceRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addRecord: (record: MaintenanceRecord) => void;
  updateRecord: (id: string, record: Partial<MaintenanceRecord>) => void;
  removeRecord: (id: string) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  records: [],
  loading: false,
  error: null,
  setRecords: (records) => set({ records }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addRecord: (record) => set((s) => ({ records: [record, ...s.records] })),
  updateRecord: (id, updated) =>
    set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...updated } : r)) })),
  removeRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
}));
