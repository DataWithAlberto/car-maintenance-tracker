import { useAuthStore } from '../store/authStore';
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
  };

  return { user, loading, login, register, logout };
};
