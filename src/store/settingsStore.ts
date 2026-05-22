import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pushEnabled: false,
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
    }),
    { name: 'fh-settings' },
  ),
);
