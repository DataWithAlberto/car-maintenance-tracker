import { Wrench, Trash2, ChevronRight } from 'lucide-react';
import type { MaintenanceRecord } from '../../types';
import { formatDate, formatCurrency, formatKm } from '../../utils/formatters';

interface Props {
  records: MaintenanceRecord[];
  onDelete?: (id: string) => void;
  onSelect?: (record: MaintenanceRecord) => void;
}

export const MaintenanceList = ({ records, onDelete, onSelect }: Props) => {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Sin registros de mantenimiento</p>
        <p className="text-sm mt-1">Añade el primero usando el modelo 3D o el botón de arriba</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <div
          key={record.id}
          className="bg-gray-800 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-750 transition-colors cursor-pointer group"
          onClick={() => onSelect?.(record)}
        >
          <div className="bg-blue-600/20 rounded-lg p-2.5 shrink-0">
            <Wrench className="h-5 w-5 text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{record.type}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-gray-400 text-sm">{formatDate(record.date)}</span>
              <span className="text-gray-600 text-xs">·</span>
              <span className="text-gray-400 text-sm">{formatKm(record.km_at_service)}</span>
              {record.cost && (
                <>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-green-400 text-sm">{formatCurrency(record.cost)}</span>
                </>
              )}
            </div>
            {record.description && (
              <p className="text-gray-500 text-xs mt-1 truncate">{record.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {record.next_service_km && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-500">Próximo</p>
                <p className="text-xs text-yellow-400">{formatKm(record.next_service_km)}</p>
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                className="text-gray-600 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
