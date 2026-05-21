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
    <nav className="bg-fog/95 border-b border-silver-mist sticky top-0 z-30" style={{ backdropFilter: 'blur(12px)' }}>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <Link to="/dashboard" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo />
          </Link>

          {selectedVehicle && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-snow border border-silver-mist rounded-button text-sm">
              <span className="tele-dot" />
              <span className="font-display text-ink font-medium" style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                {selectedVehicle.brand} {selectedVehicle.model}
              </span>
              <span className="font-sans text-caption text-graphite">/{selectedVehicle.year}</span>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-silver-mist transition-colors focus-ring"
            >
              <span className="font-sans h-7 w-7 rounded-button bg-azure/10 border border-azure/30 text-azure text-xs font-semibold flex items-center justify-center">
                {initials}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-graphite hidden sm:block" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 bg-snow border border-silver-mist rounded-card overflow-hidden"
                style={{ animation: 'slide-up 0.18s var(--ease-out-expo)' }}
              >
                <div className="px-4 py-3 border-b border-silver-mist">
                  <p className="font-sans text-body text-ink truncate">{user?.email}</p>
                  <p className="font-sans text-caption text-graphite mt-0.5">Tu cuenta</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 font-sans text-body text-slate hover:text-ink hover:bg-fog transition-colors focus-ring"
                >
                  <User className="h-4 w-4 shrink-0" />
                  Ajustes
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 font-sans text-body text-danger-500 hover:bg-danger-500/8 transition-colors focus-ring"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
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
