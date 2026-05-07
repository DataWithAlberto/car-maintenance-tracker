import { X, PlusCircle } from 'lucide-react';
import { CAR_PARTS } from '../../utils/constants';
import type { MaintenanceRecord } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface Props {
  partKey: string;
  records: MaintenanceRecord[];
  onClose: () => void;
  onAddMaintenance: (type: string) => void;
}

export const PartInfoOverlay = ({ partKey, records, onClose, onAddMaintenance }: Props) => {
  const part = CAR_PARTS[partKey];
  if (!part) return null;

  const relevantRecords = records
    .filter((r) => part.maintenanceTypes.includes(r.type))
    .slice(0, 5);

  return (
    <div className="absolute right-4 top-4 bottom-4 w-72 bg-gray-900/95 border border-gray-700 rounded-2xl flex flex-col overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-white font-semibold">{part.label}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Mantenimientos relacionados</p>
          {relevantRecords.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin registros para esta parte</p>
          ) : (
            <div className="space-y-2">
              {relevantRecords.map((r) => (
                <div key={r.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <span className="text-white text-sm font-medium">{r.type}</span>
                    {r.cost && <span className="text-green-400 text-xs">{formatCurrency(r.cost)}</span>}
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{formatDate(r.date)} · {r.km_at_service.toLocaleString()} km</p>
                  {r.description && <p className="text-gray-500 text-xs mt-1 truncate">{r.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Añadir registro</p>
          <div className="space-y-1">
            {part.maintenanceTypes.map((type) => (
              <button
                key={type}
                onClick={() => onAddMaintenance(type)}
                className="w-full flex items-center gap-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors"
              >
                <PlusCircle className="h-4 w-4 text-blue-400 shrink-0" />
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
