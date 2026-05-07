import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, RotateCcw } from 'lucide-react';
import { CarViewer } from '../components/3d/CarViewer';
import { PartInfoOverlay } from '../components/3d/PartInfoOverlay';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { AlertCard } from '../components/alerts/AlertCard';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { useVehicle } from '../hooks/useVehicle';
import { calculateAlerts } from '../utils/calculations';
import { formatKm } from '../utils/formatters';
import toast from 'react-hot-toast';

export const CarPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { records, fetchRecords, createRecord } = useMaintenance(selectedVehicle?.id);
  const { updateVehicle } = useVehicle();
  const navigate = useNavigate();

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [prefilledType, setPrefilledType] = useState('');
  const [autoRotate, setAutoRotate] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedVehicle) {
      navigate('/dashboard');
      return;
    }
    fetchRecords();
  }, [selectedVehicle?.id]);

  if (!selectedVehicle) return null;

  const alerts = calculateAlerts(selectedVehicle, records).filter(
    (a) => !dismissedAlerts.has(a.id),
  );

  const handlePartClick = (partKey: string) => {
    setSelectedPart(partKey);
    setAutoRotate(false);
  };

  const handleAddMaintenance = (type: string) => {
    setPrefilledType(type);
    setShowMaintenanceForm(true);
  };

  const handleCreateRecord = async (data: Parameters<typeof createRecord>[0]) => {
    await createRecord(data);
    await updateVehicle(selectedVehicle.id, { current_km: Math.max(selectedVehicle.current_km, data.km_at_service) });
    toast.success('Registro añadido');
    setShowMaintenanceForm(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Vehicle header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-white font-semibold">
            {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}
          </h1>
          <p className="text-gray-400 text-sm">{formatKm(selectedVehicle.current_km)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-lg text-sm transition-colors ${autoRotate ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            title="Auto-rotar"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setPrefilledType(''); setShowMaintenanceForm(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir registro
          </button>
        </div>
      </div>

      {/* Alerts strip */}
      {alerts.length > 0 && (
        <div className="bg-gray-900/50 border-b border-gray-800 px-6 py-2 flex gap-2 overflow-x-auto scrollbar-none">
          {alerts.map((a) => (
            <div key={a.id} className="shrink-0 max-w-xs">
              <AlertCard alert={a} onDismiss={(id) => setDismissedAlerts((s) => new Set([...s, id]))} />
            </div>
          ))}
        </div>
      )}

      {/* 3D Viewer */}
      <div className="flex-1 relative bg-gradient-to-b from-gray-950 to-gray-900">
        <CarViewer onPartClick={handlePartClick} autoRotate={autoRotate} modelUrl="/models/ford_focus.glb" />

        {/* Click hint */}
        {!selectedPart && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/80 text-gray-400 text-xs px-4 py-2 rounded-full border border-gray-700 pointer-events-none">
            Haz clic en una parte del coche para ver detalles
          </div>
        )}

        {selectedPart && (
          <PartInfoOverlay
            partKey={selectedPart}
            records={records}
            onClose={() => setSelectedPart(null)}
            onAddMaintenance={handleAddMaintenance}
          />
        )}
      </div>

      {showMaintenanceForm && (
        <MaintenanceForm
          initialType={prefilledType}
          currentKm={selectedVehicle.current_km}
          onSubmit={handleCreateRecord}
          onClose={() => setShowMaintenanceForm(false)}
        />
      )}
    </div>
  );
};
