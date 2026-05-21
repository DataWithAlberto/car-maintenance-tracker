import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Crown, Pencil, Eye } from 'lucide-react';
import { sharingService } from '../services/sharing.service';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { Button } from '../components/ui/Button';
import { FloatingInput } from '../components/ui/FloatingInput';
import toast from 'react-hot-toast';

type Step = 'loading' | 'confirm' | 'auth' | 'done' | 'error';

const roleConfig = {
  owner:  { Icon: Crown,  label: 'Propietario' },
  editor: { Icon: Pencil, label: 'Editor' },
  viewer: { Icon: Eye,    label: 'Visor' },
} as const;

export const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>('loading');
  const [invite, setInvite] = useState<{
    vehicles: { brand: string; model: string; year: number };
    role: keyof typeof roleConfig;
  } | null>(null);
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
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--color-fog)' }}
    >
      <div className="w-full max-w-md">
        {/* Mark */}
        <div className="flex justify-center mb-8">
          <span
            className="rounded-[16px] bg-ink flex items-center justify-center"
            style={{ width: 56, height: 56 }}
          >
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10.25" stroke="#fff" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2.4" fill="#fff" />
              <path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3"
                stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <div className="bg-snow border border-silver-mist rounded-[28px] p-8">
          {step === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-full border border-silver-mist" />
                <div className="absolute inset-0 rounded-full border border-transparent border-t-ink animate-spin" />
              </div>
              <p
                className="font-text text-graphite mt-4"
                style={{ fontSize: 14 }}
              >
                Cargando invitación...
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4">
              <div className="h-14 w-14 mx-auto rounded-[18px] bg-fog flex items-center justify-center mb-5">
                <XCircle className="h-7 w-7" style={{ color: '#b64400' }} strokeWidth={1.5} />
              </div>
              <h2
                className="text-ink"
                style={{
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                  fontWeight: 600, fontSize: 24, lineHeight: 1.2, letterSpacing: '-0.36px',
                }}
              >
                Link inválido o expirado
              </h2>
              <p
                className="font-text text-graphite mt-3 max-w-xs mx-auto"
                style={{ fontSize: 15, lineHeight: 1.45 }}
              >
                Pide al propietario que genere un link nuevo para volver a invitarte.
              </p>
              <Link to="/login" className="inline-block mt-6">
                <Button variant="secondary">Ir al login</Button>
              </Link>
            </div>
          )}

          {step === 'confirm' && vehicle && cfg && RoleIcon && (
            <div className="text-center">
              <span className="eyebrow">Te han invitado</span>
              <h2
                className="text-ink mt-3"
                style={{
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                  fontWeight: 700, fontSize: 40, lineHeight: 1.07, letterSpacing: '-0.6px',
                }}
              >
                Acceso a vehículo
              </h2>

              <div className="mt-6 bg-fog rounded-[20px] p-5">
                <p
                  className="font-display text-ink"
                  style={{ fontWeight: 600, fontSize: 22, letterSpacing: '-0.36px' }}
                >
                  {vehicle.brand} {vehicle.model}
                </p>
                <p
                  className="font-text text-graphite mt-1"
                  style={{ fontSize: 14 }}
                >
                  {vehicle.year}
                </p>
                <span
                  className="inline-flex items-center gap-1 mt-3 font-mono uppercase text-graphite"
                  style={{ fontSize: 11, letterSpacing: '0.14em' }}
                >
                  <RoleIcon className="h-3 w-3" strokeWidth={1.6} />
                  {cfg.label}
                </span>
              </div>

              <Button
                variant="accent"
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
              <div className="text-center">
                <span className="eyebrow">Te han invitado</span>
                <h2
                  className="text-ink mt-3"
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.4px',
                  }}
                >
                  Acceso a vehículo
                </h2>
              </div>
              <div className="bg-fog rounded-[20px] p-4 mt-5 mb-6 text-center">
                <p
                  className="font-text text-ink font-medium"
                  style={{ fontSize: 15 }}
                >
                  {vehicle.brand} {vehicle.model} · {vehicle.year}
                </p>
                <span
                  className="inline-flex items-center gap-1 mt-2 font-mono uppercase text-graphite"
                  style={{ fontSize: 11, letterSpacing: '0.14em' }}
                >
                  <RoleIcon className="h-3 w-3" strokeWidth={1.6} />
                  {cfg.label}
                </span>
              </div>

              <p
                className="font-text text-graphite text-center mb-4"
                style={{ fontSize: 14 }}
              >
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
                <Button variant="accent" type="submit" loading={loading} fullWidth>
                  {loading ? '...' : authMode === 'login' ? 'Entrar y aceptar' : 'Registrarme y aceptar'}
                </Button>
              </form>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full text-center font-text text-cobalt-link mt-4 hover:opacity-70 transition-opacity"
                style={{ fontSize: 14 }}
              >
                {authMode === 'login' ? '¿Sin cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="h-14 w-14 mx-auto rounded-[18px] bg-fog flex items-center justify-center mb-5">
                <CheckCircle className="h-7 w-7" style={{ color: '#1a9e3f' }} strokeWidth={1.5} />
              </div>
              <h2
                className="text-ink"
                style={{
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                  fontWeight: 600, fontSize: 24, lineHeight: 1.2, letterSpacing: '-0.36px',
                }}
              >
                ¡Acceso activado!
              </h2>
              <p
                className="font-text text-graphite mt-3"
                style={{ fontSize: 15, lineHeight: 1.45 }}
              >
                Redirigiendo al dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
