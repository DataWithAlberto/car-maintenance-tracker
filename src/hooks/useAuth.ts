import { useAuthStore } from '../store/authStore';
import { useApiKeyStore } from '../store/apiKeyStore';
import { authService } from '../services/auth.service';
import type { LoginInput, RegisterInput } from '../utils/validators';

export const useAuth = () => {
  const { user, loading } = useAuthStore();

  const login = async (input: LoginInput) => {
    await authService.login(input);
  };

  const register = async (input: RegisterInput) => {
    await authService.register(input);
  };

  const logout = async () => {
    await authService.logout();
    // La API key vive solo en este navegador: se borra al salir para no
    // dejarla accesible en equipos compartidos.
    useApiKeyStore.getState().clearAnthropicApiKey();
  };

  return { user, loading, login, register, logout };
};
