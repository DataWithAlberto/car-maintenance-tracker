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
    <nav className="bg-bg/95 border-b border-border sticky top-0 z-30" style={{ backdropFilter: 'blur(12px)' }}>
      {/* Racing stripe top */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <Link to="/dashboard" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo />
          </Link>

          {selectedVehicle && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface border border-border/80 rounded-lg text-sm">
              <span className="tele-dot" style={{ background: 'var(--color-success-500)' }} />
              <span
                className="text-white font-bold uppercase tracking-wide"
                style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}
              >
                {selectedVehicle.brand} {selectedVehicle.model}
              </span>
              <span className="text-gray-600 font-mono text-xs">/{selectedVehicle.year}</span>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface transition-colors focus-ring"
            >
              <span
                className="h-7 w-7 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-bold flex items-center justify-center"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {initials}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500 hidden sm:block" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
                style={{ animation: 'slide-up 0.18s var(--ease-out-expo)' }}
              >
                <div className="px-4 py-3 border-b border-border/60">
                  <p className="text-white text-xs font-mono truncate">{user?.email}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 font-mono uppercase tracking-wider">Tu cuenta</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-surface-2 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Ajustes
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger-400 hover:bg-danger-500/8 transition-colors"
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
