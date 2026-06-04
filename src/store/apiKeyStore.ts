import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

export type AIProvider = 'gemini' | 'ollama';

interface ApiKeyState {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  clearGeminiApiKey: () => void;

  aiProvider: AIProvider;
  setAIProvider: (provider: AIProvider) => void;

  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;

  ollamaModel: string;
  setOllamaModel: (model: string) => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      clearGeminiApiKey: () => set({ geminiApiKey: '' }),

      aiProvider: 'gemini',
      setAIProvider: (aiProvider) => set({ aiProvider }),

      ollamaUrl: 'http://localhost:11434',
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),

      ollamaModel: 'llama3.1',
      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
    }),
    {
      name: 'cmt-ai-config',
      partialize: ({ aiProvider, ollamaUrl, ollamaModel }) => ({
        aiProvider,
        ollamaUrl,
        ollamaModel,
      }),
    },
  ),
);

/** Config compacta para pasar al aiService.
 * Cualquier consumidor puede llamar a useApiKeyStore.getState() y construirla. */
export interface AIConfig {
  provider: AIProvider;
  geminiApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
}

export const selectAIConfig = (state: ApiKeyState): AIConfig => ({
  provider: state.aiProvider,
  geminiApiKey: state.geminiApiKey,
  ollamaUrl: state.ollamaUrl,
  ollamaModel: state.ollamaModel,
});

/** Hook reactivo a la config de IA.
 * Usa useShallow para evitar el bucle infinito de renders: el selector
 * crea un objeto nuevo en cada llamada y zustand v5 compara con Object.is,
 * así que sin comparación shallow re-renderizaría sin parar. */
export const useAIConfig = (): AIConfig => useApiKeyStore(useShallow(selectAIConfig));

/** Comprueba si el provider activo está listo para usarse. */
export const isAIReady = (cfg: AIConfig): boolean => {
  if (cfg.provider === 'gemini') return true;
  if (cfg.provider === 'ollama')
    return cfg.ollamaUrl.trim().length > 0 && cfg.ollamaModel.trim().length > 0;
  return false;
};

/** Mensaje amigable cuando no está listo. */
export const aiReadinessMessage = (cfg: AIConfig): string | null => {
  if (isAIReady(cfg)) return null;
  if (cfg.provider === 'gemini') return 'Configura GEMINI_API_KEY en el servidor o una clave de Gemini en Ajustes';
  if (cfg.provider === 'ollama') return 'Configura la URL y el modelo de Ollama en Ajustes';
  return 'Configura un proveedor de IA en Ajustes';
};
