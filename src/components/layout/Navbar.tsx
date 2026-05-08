import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useVehicleStore } from '../../store/vehicleStore';
import { Logo } from '../ui/Logo';
import toast from 'react-hot-toast';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { selectedVehicle } = useVehicleStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const initials = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <nav className="bg-canvas-white/95 border-b border-sky-blueprint/20 sticky top-0 z-30" style={{ backdropFilter: 'blur(12px)' }}>
      {/* Dyotanya top accent stripe */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-blueprint/50 to-transparent" />

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <Link to="/dashboard" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo />
          </Link>

          {selectedVehicle && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-cloud-white border border-sky-blueprint/25 rounded-button shadow-subtle text-sm">
              <span className="tele-dot" style={{ background: 'var(--color-success-500)' }} />
              <span className="font-simeiz text-ink-black font-light" style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                {selectedVehicle.brand} {selectedVehicle.model}
              </span>
              <span className="font-manrope text-caption text-ink-charcoal/60">/{selectedVehicle.year}</span>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-canvas-50 transition-colors focus-ring"
            >
              <span className="font-manrope h-7 w-7 rounded-button bg-sky-blueprint/15 border border-sky-blueprint/40 text-sky-dark text-xs font-semibold flex items-center justify-center">
                {initials}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-charcoal hidden sm:block" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 bg-cloud-white border border-sky-blueprint/25 rounded-card shadow-card overflow-hidden"
                style={{ animation: 'slide-up 0.18s var(--ease-out-expo)' }}
              >
                <div className="px-4 py-3 border-b border-sky-blueprint/15">
                  <p className="font-manrope text-body text-ink-black truncate">{user?.email}</p>
                  <p className="font-manrope text-caption text-ink-charcoal/60 mt-0.5">Tu cuenta</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 font-manrope text-body text-ink-charcoal hover:text-ink-black hover:bg-canvas-50 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Ajustes
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 font-manrope text-body text-sunset-orange hover:bg-sunset-orange/8 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
