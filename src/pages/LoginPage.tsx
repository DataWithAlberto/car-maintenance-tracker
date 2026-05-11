import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../utils/validators';
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
      result.error.issues.forEach((e) => { errs[e.path[0] as string] = e.message; });
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
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ── Left panel — decorative ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-cloud-white border-r border-sky-blueprint/25 p-10 relative overflow-hidden">
        {/* Diagonal grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)',
          }}
        />
        {/* Corner accent */}
        <div
          className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 100% 100%, rgba(232,68,10,0.15), transparent 70%)',
          }}
        />
        <div
          className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.10), transparent 70%)',
          }}
        />

        {/* Logo area */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
                <rect x="9" y="11" width="14" height="10" rx="2" />
                <circle cx="12" cy="16" r="1" />
              </svg>
            </div>
            <span className="font-simeiz text-ink-black text-body-lg font-light italic tracking-tight">
              FocusHub
            </span>
          </div>

          {/* Big headline */}
          <h2
            className="font-display text-ink leading-none mb-4"
            style={{ fontSize: '3.5rem', fontWeight: 700, letterSpacing: '-0.9px' }}
          >
            Tu garaje<br />
            <span className="text-azure">digital.</span>
          </h2>
          <p className="font-manrope text-body text-ink-charcoal/75 leading-relaxed max-w-xs">
            Control total sobre el mantenimiento, gastos y documentación de tu vehículo.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative space-y-3">
          {[
            { code: '01', label: 'Registro de mantenimiento' },
            { code: '02', label: 'Alertas inteligentes por km' },
            { code: '03', label: 'Modelo 3D interactivo' },
            { code: '04', label: 'Historial de gastos' },
          ].map(({ code, label }) => (
            <div key={code} className="flex items-center gap-3">
              <span className="font-manrope text-caption text-sunset-orange/70 w-5 shrink-0">{code}</span>
              <div className="h-px w-4 bg-sky-blueprint/30" />
              <span className="font-manrope text-caption text-ink-charcoal/80">{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="font-manrope text-caption text-ink-charcoal/45 relative">
          Sistema v0.2 · 2026
        </p>
      </div>

      {/* ── Right panel — auth form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="w-full max-w-sm relative page-enter">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="tele-dot" />
              <span className="font-sans text-caption text-graphite tracking-wider">Autenticación</span>
            </div>
            <h1
              className="font-display text-ink leading-none mb-2"
              style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.6px' }}
            >
              Acceso al<br />sistema
            </h1>
            <p className="font-manrope text-body text-ink-charcoal/70">
              Introduce tus credenciales para continuar
            </p>
          </div>

          {/* Form card */}
          <div className="bg-cloud-white border border-sky-blueprint/25 rounded-card shadow-card p-6">
            {/* Top stripe */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/40 to-transparent -mt-6 mb-6 mx-[-24px] w-[calc(100%+48px)]" />

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
              <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-sky-blueprint/20 flex items-center justify-between">
              <span className="font-manrope text-caption text-ink-charcoal/65">¿Sin cuenta?</span>
              <Link
                to="/register"
                className="font-manrope text-caption text-sunset-orange hover:opacity-70 transition-opacity"
              >
                Registrarse →
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="font-manrope text-center text-caption text-ink-charcoal/45 mt-6">
            FocusHub · Sistema de gestión vehicular
          </p>
        </div>
      </div>
    </div>
  );
};
