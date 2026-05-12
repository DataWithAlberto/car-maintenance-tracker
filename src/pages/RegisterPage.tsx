import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { registerSchema } from '../utils/validators';
import { Logo } from '../components/ui/Logo';
import { FloatingInput } from '../components/ui/FloatingInput';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = registerSchema.safeParse(form);
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
      await register(form);
      toast.success('Cuenta creada. Revisa tu email para verificar.');
      navigate('/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 page-enter">
          <div className="flex justify-center mb-4">
            <Logo size={48} withText={false} />
          </div>
          <h1 className="font-simeiz text-heading-lg font-light text-ink-black tracking-tight">
            Focus<span className="bg-gradient-to-br from-brand-300 via-brand-500 to-accent-500 bg-clip-text text-transparent">Hub</span>
          </h1>
          <p className="text-ink-charcoal mt-1.5 text-sm">Empieza tu garaje digital</p>
        </div>

        <div className="bg-cloud-white border border-sky-blueprint/25 rounded-card shadow-card p-8">
          <h2 className="text-xl font-semibold text-ink-black tracking-tight mb-1">Crear cuenta</h2>
          <p className="text-ink-charcoal text-sm mb-6">Es gratis y tarda 30 segundos</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FloatingInput
              type="text"
              label="Nombre completo"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              error={errors.full_name}
              autoComplete="name"
            />
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
              hint="Mínimo 6 caracteres"
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} fullWidth size="lg">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-ink-charcoal text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-sunset-orange hover:opacity-70 font-medium transition-opacity">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
