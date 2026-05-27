import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { registerSchema } from '../utils/validators';
import { FloatingInput } from '../components/ui/FloatingInput';
import toast from 'react-hot-toast';

const GRADIENT_INDIGO =
  'linear-gradient(184deg, rgb(29,29,31) 18%, rgb(168,211,251) 45%, rgb(0,18,249) 78%, rgb(37,53,224) 98%)';

/* Inline FocusHub mark — single-stroke, Apple-style. */
function Mark({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10.25" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.4" fill={color} />
      <path
        d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
      result.error.issues.forEach((issue) => {
        errs[issue.path[0] as string] = issue.message;
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
    <div
      data-theme="light"
      className="min-h-screen relative overflow-hidden"
      style={{
        background: GRADIENT_INDIGO,
        fontFamily: 'var(--font-sf-pro-text)',
      }}
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
          <span
            style={{
              font: '600 13px/1 inherit',
              color: 'rgba(255,255,255,.92)',
              letterSpacing: '-0.06px',
            }}
          >
            FocusHub
          </span>
        </div>
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
            Tu garaje
            <br />
            digital.
          </h1>
          <p
            style={{
              fontSize: 18,
              fontWeight: 400,
              color: 'rgba(255,255,255,.82)',
              lineHeight: 1.4,
            }}
          >
            Crea tu cuenta. Tarda 30 segundos.
          </p>
        </div>
        <AuthCard
          form={form}
          setForm={setForm}
          errors={errors}
          loading={loading}
          handleSubmit={handleSubmit}
          style={{ width: '100%', maxWidth: 420, padding: 24 }}
        />
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
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
            Tu garaje
            <br />
            digital.
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
            Crea una cuenta gratis. Registra tus vehículos, mantenimientos y gastos — todo desde una
            sola interfaz.
          </p>
        </div>

        <AuthCard
          form={form}
          setForm={setForm}
          errors={errors}
          loading={loading}
          handleSubmit={handleSubmit}
          style={{
            position: 'absolute',
            right: 80,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 420,
            padding: 36,
          }}
        />

        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between"
          style={{ height: 48, padding: '0 40px', fontSize: 12, color: 'rgba(255,255,255,.7)' }}
        >
          <span>Crea cuenta gratis · Sin tarjeta</span>
          <span>Conexión cifrada · TLS 1.3</span>
        </div>
      </div>
    </div>
  );
};

/* ── Auth card extracted as a sub-component ── */
interface AuthCardProps {
  form: { email: string; password: string; full_name: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ email: string; password: string; full_name: string }>
  >;
  errors: Record<string, string>;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  style?: React.CSSProperties;
}

function AuthCard({ form, setForm, errors, loading, handleSubmit, style }: AuthCardProps) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.78)',
        backdropFilter: 'saturate(180%) blur(28px)',
        WebkitBackdropFilter: 'saturate(180%) blur(28px)',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,.5)',
        color: 'var(--color-ink)',
        ...style,
      }}
    >
      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-3.5">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#1cb05c',
            boxShadow: '0 0 6px rgba(28,176,92,.6)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-slate)',
            letterSpacing: '-0.04px',
          }}
        >
          Nuevo · Gratis
        </span>
      </div>

      <h2
        style={{
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.6px',
          margin: '0 0 6px',
        }}
      >
        Crear cuenta
      </h2>
      <p
        style={{ fontSize: 15, lineHeight: 1.43, color: 'var(--color-slate)', margin: '0 0 22px' }}
      >
        Tarda 30 segundos. No pedimos tarjeta ni dirección.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {/* Primary CTA — dark pill (gradient backdrop rule) */}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 10,
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
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-slate)', marginTop: 6 }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#0066cc', fontWeight: 500, textDecoration: 'none' }}>
            Inicia sesión →
          </Link>
        </p>
      </form>
    </div>
  );
}
