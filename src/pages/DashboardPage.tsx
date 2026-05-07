import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Car, Wrench, DollarSign, AlertTriangle } from 'lucide-react';
import { useVehicle } from '../hooks/useVehicle';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { AlertCard } from '../components/alerts/AlertCard';
import { calculateAlerts } from '../utils/calculations';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { maintenanceService } from '../services/maintenance.service';
import { useVehicleStore } from '../store/vehicleStore';
import { formatKm } from '../utils/formatters';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const { vehicles, loading, fetchVehicles, createVehicle, setSelectedVehicle } = useVehicle();
  const { setSelectedVehicle: storeSet } = useVehicleStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [alerts, setAlerts] = useState<ReturnType<typeof calculateAlerts>>([]);
  const { records } = useMaintenanceStore();

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSelectVehicle = async (vehicleId: string) => {
    const v = vehicles.find((v) => v.id === vehicleId);
    if (!v) return;
    storeSet(v);

    const recs = await maintenanceService.getByVehicle(vehicleId);
    const newAlerts = calculateAlerts(v, recs);
    setAlerts(newAlerts.filter((a) => !a.is_dismissed));
    navigate('/car');
  };

  const handleCreate = async (data: Parameters<typeof createVehicle>[0]) => {
    try {
      const v = await createVehicle(data);
      toast.success('Vehículo añadido');
      storeSet({ ...v, role: 'owner' });
      navigate('/car');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear vehículo');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Tus vehículos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir vehículo
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Alertas activas
          </p>
          {alerts.slice(0, 3).map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16">
          <Car className="h-16 w-16 mx-auto text-gray-700 mb-4" />
          <h2 className="text-xl font-semibold text-gray-400">Sin vehículos</h2>
          <p className="text-gray-600 mt-2 mb-6">Añade tu primer coche para empezar</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 font-medium transition-colors"
          >
            Añadir vehículo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => handleSelectVehicle(v.id)}
              className="bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-2xl p-5 text-left transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    {v.brand} {v.model}
                  </h3>
                  <p className="text-gray-400 text-sm">{v.year}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  v.role === 'owner' ? 'bg-blue-600/20 text-blue-400' :
                  v.role === 'editor' ? 'bg-green-600/20 text-green-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {v.role === 'owner' ? 'Propietario' : v.role === 'editor' ? 'Editor' : 'Visor'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {formatKm(v.current_km)}
                </span>
                {v.color && <span>{v.color}</span>}
                {v.fuel_type && <span>{v.fuel_type}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <VehicleForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};
