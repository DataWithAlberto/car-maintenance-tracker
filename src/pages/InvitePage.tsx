import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Car, CheckCircle, XCircle } from 'lucide-react';
import { sharingService } from '../services/sharing.service';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

type Step = 'loading' | 'confirm' | 'auth' | 'done' | 'error';

export const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>('loading');
  const [invite, setInvite] = useState<{ vehicles: { brand: string; model: string; year: number }; role: string } | null>(null);
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

  // Auto-accept if user logs in while on this page
  useEffect(() => {
    if (user && step === 'auth') setStep('confirm');
  }, [user]);

  const handleAccept = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      await sharingService.acceptInviteByToken(token, user.id);
      setStep('done');
      toast.success('Acceso aceptado');
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
      // After auth, accept invite
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

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Car className="h-12 w-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">CarHub</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {step === 'loading' && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-6">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <h2 className="text-white font-semibold text-lg">Link inválido o expirado</h2>
              <p className="text-gray-400 text-sm mt-2">Pide al propietario que genere un nuevo link.</p>
              <Link to="/login" className="text-blue-400 text-sm mt-4 block hover:underline">Ir al login</Link>
            </div>
          )}

          {step === 'confirm' && vehicle && (
            <div className="text-center">
              <h2 className="text-white font-semibold text-xl mb-2">Invitación a vehículo</h2>
              <p className="text-gray-400 mb-1">Te han invitado a acceder a:</p>
              <div className="bg-gray-800 rounded-xl p-4 my-4">
                <p className="text-white font-bold text-lg">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
                <p className="text-blue-400 text-sm mt-1">Rol: {invite?.role}</p>
              </div>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-3 font-medium transition-colors"
              >
                {loading ? 'Aceptando...' : 'Aceptar acceso'}
              </button>
            </div>
          )}

          {step === 'auth' && vehicle && (
            <div>
              <h2 className="text-white font-semibold text-xl mb-1 text-center">Invitación a vehículo</h2>
              <div className="bg-gray-800 rounded-xl p-3 my-3 text-center">
                <p className="text-white font-medium">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
                <p className="text-blue-400 text-xs mt-1">Rol: {invite?.role}</p>
              </div>
              <p className="text-gray-400 text-sm text-center mb-4">
                {authMode === 'login' ? 'Inicia sesión para aceptar' : 'Crea una cuenta para aceptar'}
              </p>

              <form onSubmit={handleAuth} className="space-y-3">
                {authMode === 'register' && (
                  <input
                    placeholder="Nombre completo"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className={inputCls}
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-medium transition-colors"
                >
                  {loading ? '...' : authMode === 'login' ? 'Entrar y aceptar' : 'Registrarme y aceptar'}
                </button>
              </form>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full text-center text-gray-400 text-sm mt-3 hover:text-white"
              >
                {authMode === 'login' ? '¿Sin cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <h2 className="text-white font-semibold text-lg">¡Acceso activado!</h2>
              <p className="text-gray-400 text-sm mt-2">Redirigiendo al dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors';
