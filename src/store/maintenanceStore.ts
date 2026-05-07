import { create } from 'zustand';
import type { MaintenanceRecord } from '../types';

interface MaintenanceState {
  records: MaintenanceRecord[];
  loading: boolean;
  setRecords: (records: MaintenanceRecord[]) => void;
  setLoading: (loading: boolean) => void;
  addRecord: (record: MaintenanceRecord) => void;
  updateRecord: (id: string, record: Partial<MaintenanceRecord>) => void;
  removeRecord: (id: string) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  records: [],
  loading: false,
  setRecords: (records) => set({ records }),
  setLoading: (loading) => set({ loading }),
  addRecord: (record) => set((s) => ({ records: [record, ...s.records] })),
  updateRecord: (id, updated) =>
    set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...updated } : r)) })),
  removeRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
}));
