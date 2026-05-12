import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../utils/validators';
import toast from 'react-hot-toast';

const GRADIENT_INDIGO =
  'linear-gradient(184deg, rgb(29,29,31) 18%, rgb(168,211,251) 45%, rgb(0,18,249) 78%, rgb(37,53,224) 98%)';

function Mark({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10.25" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.4" fill={color} />
      <path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => { errs[issue.path[0] as string] = issue.message; });
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

  const inputBase: React.CSSProperties = {
    width: '100%',
    background: '#ffffff',
    border: '1px solid #e8e8ed',
    borderRadius: 12,
    padding: '14px 16px',
    fontSize: 17,
    fontFamily: 'SF Pro Text, ui-sans-serif, system-ui, -apple-system, sans-serif',
    color: '#1d1d1f',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelBase: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#1d1d1f',
    marginBottom: 8,
    fontFamily: 'SF Pro Text, ui-sans-serif, system-ui, -apple-system, sans-serif',
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: GRADIENT_INDIGO, fontFamily: 'SF Pro Text, ui-sans-serif, system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Top nav ── */}
      <nav
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between"
        style={{
          height: 44,
          padding: '0 40px',
          background: 'rgba(0,0,0,.18)',
          backdropFilter: 'saturate(180%) blur(16px)',
          WebkitBackdropFilter: 'saturate(180%) blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Mark size={18} />
          <span style={{ font: '600 13px/1 inherit', color: 'rgba(255,255,255,.92)', letterSpacing: '-0.06px' }}>
            FocusHub
          </span>
        </div>
        <div />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>ES</span>
      </nav>

      {/* ── Mobile / tablet stacked layout ── */}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-16 gap-10">
        <div className="text-center">
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.9px',
              color: '#ffffff',
              margin: '0 0 12px',
            }}
          >
            Toma el<br />volante.
          </h1>
          <p style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,.82)', lineHeight: 1.4 }}>
            Control total sobre tu vehículo.
          </p>
        </div>
        <AuthCard
          form={form}
          setForm={setForm}
          errors={errors}
          loading={loading}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          handleSubmit={handleSubmit}
          inputBase={inputBase}
          labelBase={labelBase}
          style={{ width: '100%', maxWidth: 420, padding: 24 }}
        />
      </div>

      {/* ── Desktop absolute layout ── */}
      <div className="hidden lg:block">
        {/* Left column */}
        <div className="absolute" style={{ left: 80, top: 130, maxWidth: 620 }}>
          <span
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.7)',
              marginBottom: 20,
            }}
          >
            FocusHub · 2026
          </span>
          <h1
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-2.11px',
              color: '#ffffff',
              margin: '0 0 20px',
            }}
          >
            Toma el<br />volante.
          </h1>
          <p
            style={{
              fontSize: 22,
              fontWeight: 300,
              lineHeight: 1.4,
              letterSpacing: '-0.2px',
              color: 'rgba(255,255,255,.82)',
              maxWidth: 480,
              margin: 0,
            }}
          >
            Control total sobre el mantenimiento, gastos y documentación de tu vehículo —
            desde una sola interfaz.
          </p>
        </div>


        {/* Auth card */}
        <AuthCard
          form={form}
          setForm={setForm}
          errors={errors}
          loading={loading}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          handleSubmit={handleSubmit}
          inputBase={inputBase}
          labelBase={labelBase}
          style={{
            position: 'absolute',
            right: 80,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 420,
            padding: 36,
          }}
        />

        {/* Bottom plate */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between"
          style={{ height: 48, padding: '0 40px', fontSize: 12, color: 'rgba(255,255,255,.7)' }}
        >
          <span>Acabado mostrado · Indigo</span>
          <span>Conexión cifrada · TLS 1.3</span>
        </div>
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
  inputBase: React.CSSProperties;
  labelBase: React.CSSProperties;
  style?: React.CSSProperties;
}

function AuthCard({
  form, setForm, errors, loading,
  showPassword, setShowPassword,
  handleSubmit, inputBase, labelBase, style,
}: AuthCardProps) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.78)',
        backdropFilter: 'saturate(180%) blur(28px)',
        WebkitBackdropFilter: 'saturate(180%) blur(28px)',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,.5)',
        color: '#1d1d1f',
        ...style,
      }}
    >
      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-3.5">
        <span
          style={{
            width: 8, height: 8, borderRadius: 999,
            background: '#1cb05c',
            boxShadow: '0 0 6px rgba(28,176,92,.6)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#474747', letterSpacing: '-0.04px' }}>
          Acceso seguro
        </span>
      </div>

      <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.6px', margin: '0 0 6px' }}>
        Iniciar sesión
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.43, color: '#474747', margin: '0 0 22px' }}>
        Tu sesión expiró por inactividad. Vuelve a entrar para continuar donde lo dejaste.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Email */}
        <div>
          <label style={labelBase}>Email</label>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="nombre@dominio.com"
            style={{
              ...inputBase,
              borderColor: errors.email ? '#d70015' : '#e8e8ed',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#1d1d1f'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? '#d70015' : '#e8e8ed'; }}
          />
          {errors.email && (
            <p style={{ fontSize: 12, color: '#d70015', marginTop: 6, marginLeft: 2 }}>{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label style={labelBase}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              style={{
                ...inputBase,
                paddingRight: 90,
                borderColor: errors.password ? '#d70015' : '#e8e8ed',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#1d1d1f'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? '#d70015' : '#e8e8ed'; }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 0,
                color: '#0066cc', fontSize: 13, cursor: 'pointer', padding: '8px 10px',
                fontFamily: 'inherit',
              }}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errors.password && (
            <p style={{ fontSize: 12, color: '#d70015', marginTop: 6, marginLeft: 2 }}>{errors.password}</p>
          )}
        </div>

        {/* Primary CTA — dark pill (gradient backdrop rule) */}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '14px 22px',
            fontSize: 17,
            fontWeight: 400,
            fontFamily: 'inherit',
            background: loading ? '#333' : '#000000',
            color: '#ffffff',
            border: 0,
            borderRadius: 999,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.1s ease',
          }}
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </button>

        {/* Footer links */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <a
            href="#"
            style={{ fontSize: 14, color: '#0066cc', textDecoration: 'none' }}
          >
            Recuperar acceso
          </a>
          <Link
            to="/register"
            style={{ fontSize: 14, color: '#0066cc', textDecoration: 'none', fontWeight: 500 }}
          >
            Crear cuenta →
          </Link>
        </div>
      </form>
    </div>
  );
}
