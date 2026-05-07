import { Link, useNavigate } from 'react-router-dom';
import { Car, Bell, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useVehicleStore } from '../../store/vehicleStore';
import toast from 'react-hot-toast';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { selectedVehicle } = useVehicleStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2 text-white font-bold text-lg">
            <Car className="h-6 w-6 text-blue-400" />
            <span className="hidden sm:block">CarHub</span>
          </Link>

          {selectedVehicle && (
            <div className="hidden md:block text-gray-400 text-sm">
              {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}
            </div>
          )}

          <div className="hidden md:flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Salir</span>
            </button>
          </div>

          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-3 space-y-2">
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  );
};
