import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../utils/validators';
import { Logo } from '../components/ui/Logo';
import { FloatingInput } from '../components/ui/FloatingInput';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((e) => {
        errs[e.path[0] as string] = e.message;
      });
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 page-enter">
          <div className="flex justify-center mb-4">
            <Logo size={48} withText={false} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Focus<span className="bg-gradient-to-br from-brand-300 via-brand-500 to-accent-500 bg-clip-text text-transparent">Hub</span>
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm">Tu garaje digital</p>
        </div>

        <div className="glass-strong border border-border rounded-3xl p-8 shadow-2xl shadow-brand-500/10">
          <h2 className="text-xl font-semibold text-white tracking-tight mb-1">Bienvenido de vuelta</h2>
          <p className="text-gray-400 text-sm mb-6">Inicia sesión para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FloatingInput
              type="email"
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              autoComplete="email"
            />

            <FloatingInput
              type="password"
              label="Contraseña"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
              autoComplete="current-password"
            />

            <Button type="submit" loading={loading} fullWidth size="lg">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            ¿Sin cuenta?{' '}
            <Link to="/register" className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
              Regístrate
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 FocusHub · Hecho con cariño
        </p>
      </div>
    </div>
  );
};
