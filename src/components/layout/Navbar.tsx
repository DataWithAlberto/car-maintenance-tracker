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
    <nav className="glass border-b border-border sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/dashboard" className="shrink-0 transition-transform hover:scale-[1.02]">
            <Logo />
          </Link>

          {selectedVehicle && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-2/60 border border-border rounded-full text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
              <span className="text-gray-300 font-medium">
                {selectedVehicle.brand} {selectedVehicle.model}
              </span>
              <span className="text-gray-500 text-xs">· {selectedVehicle.year}</span>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-surface-2 transition-colors focus-ring"
            >
              <span className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-sm font-semibold flex items-center justify-center">
                {initials}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-60 glass-strong border border-border rounded-xl shadow-2xl overflow-hidden"
                style={{ animation: 'slide-up 0.2s var(--ease-out-expo)' }}
              >
                <div className="p-3 border-b border-border/60">
                  <p className="text-white text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Tu cuenta</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-2 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Ajustes
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger-400 hover:bg-danger-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
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
