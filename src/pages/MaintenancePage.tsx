import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { MaintenanceList } from '../components/maintenance/MaintenanceList';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { MAINTENANCE_TYPES } from '../utils/constants';
import toast from 'react-hot-toast';

export const MaintenancePage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { records, loading, fetchRecords, createRecord, deleteRecord } = useMaintenance(selectedVehicle?.id);
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    fetchRecords();
  }, [selectedVehicle?.id]);

  if (!selectedVehicle) return null;

  const filtered = filterType ? records.filter((r) => r.type === filterType) : records;

  const handleCreate = async (data: Parameters<typeof createRecord>[0]) => {
    await createRecord(data);
    toast.success('Registro añadido');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await deleteRecord(id);
    toast.success('Registro eliminado');
  };

  const totalCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mantenimiento</h1>
          <p className="text-gray-400 text-sm mt-1">
            {records.length} registros · {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalCost)} total
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos los tipos</option>
          {MAINTENANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        {filterType && (
          <button onClick={() => setFilterType('')} className="text-gray-400 hover:text-white text-sm">
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <MaintenanceList records={filtered} onDelete={handleDelete} />
      )}

      {showForm && (
        <MaintenanceForm
          currentKm={selectedVehicle.current_km}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};
