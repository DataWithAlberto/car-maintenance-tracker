import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, AlertTriangle, Settings as SettingsIcon, Car, LogOut } from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { useVehicle } from '../hooks/useVehicle';
import { useAuth } from '../hooks/useAuth';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { formatKm } from '../utils/formatters';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { updateVehicle, deleteVehicle } = useVehicle();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);

  if (!selectedVehicle) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-md mx-auto">
        <EmptyState
          icon={Car}
          title="Selecciona un vehículo"
          description="Elige un vehículo desde el Dashboard para configurar sus ajustes."
          action={
            <Button onClick={() => navigate('/dashboard')}>
              Ir al Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  const handleUpdate = async (data: Parameters<typeof updateVehicle>[1]) => {
    await updateVehicle(selectedVehicle.id, data);
    toast.success('Vehículo actualizado');
    setShowEditForm(false);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedVehicle.brand} ${selectedVehicle.model}? Esta acción no se puede deshacer.`)) return;
    await deleteVehicle(selectedVehicle.id);
    toast.success('Vehículo eliminado');
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-ink-charcoal font-semibold mb-1">
          {selectedVehicle.brand} {selectedVehicle.model}
        </p>
        <h1 className="font-simeiz text-heading-lg font-light text-ink-black tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-sky-dark" />
          Ajustes
        </h1>
      </header>

      {/* Account section */}
      <section className="bg-cloud-white border border-sky-blueprint/25 rounded-card shadow-card p-20">
        <h2 className="text-[10px] uppercase tracking-wider text-ink-charcoal font-semibold mb-3">Tu cuenta</h2>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-cloud-white text-lg font-semibold flex items-center justify-center">
            {(user?.email?.[0] ?? 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink-black text-sm font-medium truncate">{user?.email}</p>
            <p className="text-ink-charcoal text-xs">Sesión iniciada</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} iconLeft={<LogOut className="h-4 w-4" />}>
            Salir
          </Button>
        </div>
      </section>

      {/* Vehicle data */}
      <section className="bg-cloud-white border border-sky-blueprint/25 rounded-card shadow-card p-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[10px] uppercase tracking-wider text-ink-charcoal font-semibold">Datos del vehículo</h2>
            <p className="text-ink-black text-xl font-semibold tracking-tight mt-1">
              {selectedVehicle.brand} {selectedVehicle.model}
              <span className="text-ink-charcoal font-normal"> · {selectedVehicle.year}</span>
            </p>
          </div>
          {selectedVehicle.role === 'owner' && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditForm(true)} iconLeft={<Pencil className="h-3.5 w-3.5" />}>
              Editar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            ['Kilómetros', formatKm(selectedVehicle.current_km)],
            ['Matrícula', selectedVehicle.license_plate ?? '—'],
            ['Color', selectedVehicle.color ?? '—'],
            ['Combustible', selectedVehicle.fuel_type ?? '—'],
            ['Transmisión', selectedVehicle.transmission ?? '—'],
            ['VIN', selectedVehicle.vin ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-canvas-50/60 border border-sky-blueprint/15 rounded-xl px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-ink-charcoal font-medium">{label}</p>
              <p className="text-ink-black text-sm font-medium tabular-nums truncate">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      {selectedVehicle.role === 'owner' && (
        <section className="bg-gradient-to-br from-danger-500/10 to-transparent border border-danger-500/30 rounded-card p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-danger-500/15 border border-danger-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-danger-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-ink-black font-semibold tracking-tight">Zona peligrosa</h3>
              <p className="text-ink-charcoal text-sm mt-1 mb-4 leading-relaxed">
                Eliminar el vehículo borrará permanentemente todos sus registros, gastos, documentos y accesos compartidos.
              </p>
              <Button variant="danger" size="sm" onClick={handleDelete} iconLeft={<Trash2 className="h-4 w-4" />}>
                Eliminar vehículo
              </Button>
            </div>
          </div>
        </section>
      )}

      {showEditForm && (
        <VehicleForm
          initialData={selectedVehicle}
          onSubmit={handleUpdate}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
};
