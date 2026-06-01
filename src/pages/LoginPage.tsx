import { useState, useId, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../utils/validators';
import toast from 'react-hot-toast';

// Fotos del carrusel (ubicadas en public/, servidas en la raíz).
const BACKGROUND_IMAGES = [
  'login-01.jpg',
  'login-02.jpg',
  'login-03.jpg',
  'login-04.jpg',
  'login-05.jpg',
];

function Mark({ size = 20, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill={color} />
    </svg>
  );
}

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Carousel State
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 15000); // 15 seconds duration per image
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errs[issue.path[0] as string] = issue.message;
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
    <div className="relative w-screen h-screen bg-black font-sans text-white overflow-hidden selection:bg-white/30 selection:text-white">
      <style>{`
        .film-grain {
          position: absolute; inset: 0; pointer-events: none; z-index: 10;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.06'/%3E%3C/svg%3E");
        }
        .ken-burns {
          animation: kenBurns 40s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes kenBurns {
          0% { transform: scale(1.05) translate(0, 0); }
          100% { transform: scale(1.15) translate(-1.5%, -1%); }
        }
        .glass-panel {
          background: rgba(10, 10, 12, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .input-glass {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          transition: all 0.2s ease;
        }
        .input-glass:focus {
          background: rgba(0, 0, 0, 0.5);
          border-color: rgba(255, 255, 255, 0.5);
          outline: none;
        }
        .input-glass::placeholder { color: rgba(255, 255, 255, 0.3); }
      `}</style>

      {/* ── Background Image Carousel ── */}
      <div className="absolute inset-0 z-0 bg-black">
        {BACKGROUND_IMAGES.map((img, idx) => (
          <img
            key={img}
            src={`/${img}`} /* Ajusta esta ruta según la carpeta pública de tus assets (ej. /images/...) */
            alt="Vehicle Background"
            className={`absolute inset-0 w-full h-full object-cover ken-burns transition-opacity duration-[3000ms] ease-in-out ${idx === imageIndex ? 'opacity-90' : 'opacity-0'}`}
            style={
              {
                filter: 'contrast(1.15) saturate(1.1) brightness(0.85)',
                imageRendering: 'high-quality',
              } as unknown as React.CSSProperties
            }
          />
        ))}
        <div className="film-grain" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
      </div>

      {/* ── Main Layout - Vignette (Left Focus) ── */}
      <div className="absolute inset-0 z-20 flex items-center p-8 lg:p-24">
        <div className="w-full max-w-[400px]">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Mark size={32} />
            </div>
            <h1 className="text-5xl font-light tracking-tighter leading-none text-white drop-shadow-2xl mb-2">
              Toma el
              <br />
              <span className="font-medium text-white/90">volante.</span>
            </h1>
          </div>

          <div className="p-8 glass-panel rounded-lg border-l-2 border-l-white/50 border-t-0 border-r-0 border-b-0 shadow-2xl">
            <AuthCard
              form={form}
              setForm={setForm}
              errors={errors}
              loading={loading}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              handleSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-8 z-50 text-white/30 text-[10px] font-mono tracking-widest uppercase hidden md:block">
        FocusHub // 4K Cinematic // Live
      </div>
    </div>
  );
};

/* ── Auth card extracted as a sub-component ── */
interface AuthCardProps {
  form: { email: string; password: string };
  setForm: React.Dispatch<React.SetStateAction<{ email: string; password: string }>>;
  errors: Record<string, string>;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: (e: React.FormEvent) => void;
}

function AuthCard({
  form,
  setForm,
  errors,
  loading,
  showPassword,
  setShowPassword,
  handleSubmit,
}: AuthCardProps) {
  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;

  return (
    <div className="w-full">
      <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
        {/* Email */}
        <div>
          <label
            htmlFor={emailId}
            className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-2"
          >
            IDENTIFICACIÓN
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Piloto // Email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            className="w-full input-glass rounded-sm px-4 py-3 text-sm font-light"
            style={{ borderColor: errors.email ? '#ef4444' : undefined }}
          />
          {errors.email && (
            <p id={`${emailId}-error`} className="text-xs text-[#ef4444] mt-2 font-medium">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor={passwordId}
            className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-2 flex justify-between"
          >
            <span>CREDENCIAL</span>
          </label>
          <div className="relative">
            <input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? `${passwordId}-error` : undefined}
              className="w-full input-glass rounded-sm px-4 py-3 text-sm font-mono tracking-widest"
              style={{
                borderColor: errors.password ? '#ef4444' : undefined,
                paddingRight: '80px',
                letterSpacing: showPassword ? 'normal' : '0.15em',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-controls={passwordId}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-[11px] font-mono uppercase tracking-wide text-white/50 hover:text-white transition-colors"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errors.password && (
            <p id={`${passwordId}-error`} className="text-xs text-[#ef4444] mt-2 font-medium">
              {errors.password}
            </p>
          )}
        </div>

        {/* Primary CTA */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-2 bg-white hover:bg-gray-200 text-black font-medium text-sm transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'VERIFICANDO...' : 'INICIAR SISTEMA'}
        </button>

        {/* Footer links */}
        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs font-light text-white/40">
          <button
            type="button"
            onClick={() => toast('Contacta con soporte para recuperar tu acceso.')}
            className="hover:text-white transition-colors"
          >
            Soporte técnico
          </button>
          <Link
            to="/register"
            className="hover:text-white transition-colors uppercase tracking-wider text-[10px] font-mono"
          >
            Crear ID ↗
          </Link>
        </div>
      </form>
    </div>
  );
}
