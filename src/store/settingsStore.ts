import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  clearAnthropicApiKey: () => void;
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      anthropicApiKey: '',
      setAnthropicApiKey: (anthropicApiKey) => set({ anthropicApiKey }),
      clearAnthropicApiKey: () => set({ anthropicApiKey: '' }),
      pushEnabled: false,
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
    }),
    { name: 'fh-settings' },
  ),
);
