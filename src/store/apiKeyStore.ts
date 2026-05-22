import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeyState {
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  clearAnthropicApiKey: () => void;
}

// La API key de Claude la aporta cada usuario ("trae tu propia key").
// Vive en su propio store, aislada de la configuración de UI, y se borra al
// cerrar sesión (ver useAuth) para no quedar accesible en equipos compartidos.
export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set) => ({
      anthropicApiKey: '',
      setAnthropicApiKey: (anthropicApiKey) => set({ anthropicApiKey }),
      clearAnthropicApiKey: () => set({ anthropicApiKey: '' }),
    }),
    { name: 'cmt-api-key' },
  ),
);
