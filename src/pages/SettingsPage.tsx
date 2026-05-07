import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { useVehicle } from '../hooks/useVehicle';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { formatKm } from '../utils/formatters';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { updateVehicle, deleteVehicle } = useVehicle();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);

  if (!selectedVehicle) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Selecciona un vehículo desde el Dashboard</p>
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

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Ajustes del vehículo</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {selectedVehicle.brand} {selectedVehicle.model}
            </h2>
            <p className="text-gray-400 text-sm">{selectedVehicle.year}</p>
          </div>
          {selectedVehicle.role === 'owner' && (
            <button
              onClick={() => setShowEditForm(true)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ['Kilómetros', formatKm(selectedVehicle.current_km)],
            ['Matrícula', selectedVehicle.license_plate ?? '—'],
            ['Color', selectedVehicle.color ?? '—'],
            ['Combustible', selectedVehicle.fuel_type ?? '—'],
            ['Transmisión', selectedVehicle.transmission ?? '—'],
            ['VIN', selectedVehicle.vin ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-white text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedVehicle.role === 'owner' && (
        <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white font-medium">Zona peligrosa</h3>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                Eliminar el vehículo borrará todos sus registros, gastos y documentos.
              </p>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar vehículo
              </button>
            </div>
          </div>
        </div>
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
