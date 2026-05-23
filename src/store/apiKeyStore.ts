import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeyState {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  clearGeminiApiKey: () => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      clearGeminiApiKey: () => set({ geminiApiKey: '' }),
    }),
    { name: 'cmt-api-key' },
  ),
);
