import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Crown, Pencil, Eye } from 'lucide-react';
import { sharingService } from '../services/sharing.service';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { FloatingInput } from '../components/ui/FloatingInput';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

type Step = 'loading' | 'confirm' | 'auth' | 'done' | 'error';

const roleConfig = {
  owner: { Icon: Crown, label: 'Propietario', cls: 'bg-brand-500/15 text-sky-dark border-sky-blueprint/30' },
  editor: { Icon: Pencil, label: 'Editor', cls: 'bg-success-500/15 text-success-400 border-success-500/30' },
  viewer: { Icon: Eye, label: 'Visor', cls: 'bg-gray-700/40 text-ink-charcoal border-gray-700' },
} as const;

export const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>('loading');
  const [invite, setInvite] = useState<{ vehicles: { brand: string; model: string; year: number }; role: keyof typeof roleConfig } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setStep('error'); return; }
    sharingService.getInviteByToken(token)
      .then((data) => {
        if (!data) { setStep('error'); return; }
        setInvite(data as typeof invite);
        setStep(user ? 'confirm' : 'auth');
      })
      .catch(() => setStep('error'));
  }, [token]);

  useEffect(() => {
    if (user && step === 'auth') setStep('confirm');
  }, [user]);

  const handleAccept = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      await sharingService.acceptInviteByToken(token, user.id);
      setStep('done');
      toast.success('Acceso activado');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch {
      toast.error('Error al aceptar invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'register') {
        await authService.register(form);
        toast.success('Cuenta creada');
      } else {
        await authService.login(form);
      }
      const session = await authService.getSession();
      if (session?.user && token) {
        await sharingService.acceptInviteByToken(token, session.user.id);
        setStep('done');
        toast.success('Acceso activado');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const vehicle = invite?.vehicles;
  const cfg = invite ? roleConfig[invite.role] : null;
  const RoleIcon = cfg?.Icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 bg-sky-blueprint/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 bg-sunset-orange/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={48} withText={false} />
          </div>
          <h1 className="font-simeiz text-heading-lg font-light text-ink-black tracking-tight">
            Focus<span className="bg-gradient-to-br from-sky-blueprint via-vivid-blue to-sunset-orange bg-clip-text text-transparent">Hub</span>
          </h1>
        </div>

        <div className="bg-cloud-white border border-sky-blueprint/25 rounded-card p-8 shadow-card">
          {step === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-400 animate-spin" />
              </div>
              <p className="font-manrope text-caption text-ink-charcoal/70 mt-4">Cargando invitación...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4">
              <div className="h-16 w-16 mx-auto rounded-card bg-danger-500/15 border border-danger-500/30 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-danger-400" />
              </div>
              <h2 className="font-simeiz text-heading font-light text-ink-black tracking-tight">Link inválido o expirado</h2>
              <p className="font-manrope text-caption text-ink-charcoal/70 mt-2 leading-relaxed">
                Pide al propietario que genere un link nuevo para volver a invitarte.
              </p>
              <Link to="/login" className="inline-block mt-6">
                <Button variant="secondary">Ir al login</Button>
              </Link>
            </div>
          )}

          {step === 'confirm' && vehicle && cfg && RoleIcon && (
            <div className="text-center">
              <p className="font-manrope text-caption text-ink-charcoal/70 tracking-wide font-semibold mb-2">Te han invitado</p>
              <h2 className="font-simeiz text-heading font-light text-ink-black tracking-tight">Acceso a vehículo</h2>

              <div className="mt-5 bg-gradient-to-br from-sky-blueprint/10 via-canvas-50 to-sunset-orange/5 border border-sky-blueprint/20 rounded-card p-5">
                <p className="font-simeiz text-heading font-light text-ink-black tracking-tight">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="font-manrope text-caption text-ink-charcoal/70 mt-0.5">{vehicle.year}</p>
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border mt-3', cfg.cls)}>
                  <RoleIcon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </div>

              <Button
                onClick={handleAccept}
                loading={loading}
                fullWidth
                size="lg"
                className="mt-6"
              >
                {loading ? 'Aceptando...' : 'Aceptar acceso'}
              </Button>
            </div>
          )}

          {step === 'auth' && vehicle && cfg && RoleIcon && (
            <div>
              <p className="font-manrope text-caption text-ink-charcoal/70 tracking-wide font-semibold mb-2 text-center">Te han invitado</p>
              <h2 className="font-simeiz text-heading font-light text-ink-black tracking-tight text-center mb-3">Acceso a vehículo</h2>
              <div className="bg-gradient-to-br from-sky-blueprint/10 via-canvas-50 to-sunset-orange/5 border border-sky-blueprint/20 rounded-card p-4 mb-5 text-center">
                <p className="text-ink-black font-semibold">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
                <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border mt-2', cfg.cls)}>
                  <RoleIcon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </div>

              <p className="font-manrope text-caption text-ink-charcoal/70 text-center mb-4">
                {authMode === 'login' ? 'Inicia sesión para aceptar' : 'Crea una cuenta para aceptar'}
              </p>

              <form onSubmit={handleAuth} className="space-y-3">
                {authMode === 'register' && (
                  <FloatingInput
                    label="Nombre completo"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                )}
                <FloatingInput
                  type="email"
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <FloatingInput
                  type="password"
                  label="Contraseña"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <Button type="submit" loading={loading} fullWidth>
                  {loading ? '...' : authMode === 'login' ? 'Entrar y aceptar' : 'Registrarme y aceptar'}
                </Button>
              </form>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full text-center font-manrope text-caption text-ink-charcoal mt-4 hover:text-ink-black transition-colors"
              >
                {authMode === 'login' ? '¿Sin cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="h-16 w-16 mx-auto rounded-card bg-success-500/15 border border-success-500/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success-400" />
              </div>
              <h2 className="font-simeiz text-heading font-light text-ink-black tracking-tight">¡Acceso activado!</h2>
              <p className="font-manrope text-caption text-ink-charcoal/70 mt-2">Redirigiendo al dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
