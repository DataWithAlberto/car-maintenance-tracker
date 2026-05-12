import { Wrench, Trash2, ChevronRight, Calendar, Gauge, Receipt } from 'lucide-react';
import type { MaintenanceRecord } from '../../types';
import { formatDate, formatCurrency, formatKm } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils/cn';

interface Props {
  records: MaintenanceRecord[];
  onDelete?: (id: string) => void;
  onSelect?: (record: MaintenanceRecord) => void;
}

export const MaintenanceList = ({ records, onDelete, onSelect }: Props) => {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="Sin registros de mantenimiento"
        description="Añade el primero usando el modelo 3D o el botón de arriba para empezar a llevar el control."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <li
          key={record.id}
          onClick={() => onSelect?.(record)}
          className={cn(
            'group bg-snow border border-silver-mist rounded-[14px] p-4',
            'flex items-center gap-4 transition-colors hover:bg-fog cursor-pointer',
          )}
        >
          <div className="shrink-0 h-11 w-11 rounded-[10px] bg-fog flex items-center justify-center">
            <Wrench className="h-5 w-5 text-ink" strokeWidth={1.6} />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="font-text text-ink font-medium truncate"
              style={{ fontSize: 15, letterSpacing: '-0.1px' }}
            >
              {record.type}
            </p>
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-graphite font-text"
              style={{ fontSize: 13 }}
            >
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" strokeWidth={1.6} />
                {formatDate(record.date)}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Gauge className="h-3 w-3" strokeWidth={1.6} />
                {formatKm(record.km_at_service)}
              </span>
              {record.cost ? (
                <span className="inline-flex items-center gap-1 tabular-nums text-ink font-medium">
                  <Receipt className="h-3 w-3" strokeWidth={1.6} />
                  {formatCurrency(record.cost)}
                </span>
              ) : null}
            </div>
            {record.description && (
              <p
                className="mt-1.5 font-text text-graphite line-clamp-1"
                style={{ fontSize: 13 }}
              >
                {record.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {record.next_service_km && (
              <div className="hidden sm:block text-right px-3 py-1.5 rounded-[10px] bg-fog">
                <p
                  className="font-mono uppercase text-graphite"
                  style={{ fontSize: 10, letterSpacing: '0.12em' }}
                >
                  Próximo
                </p>
                <p
                  className="font-text text-ink font-medium tabular-nums mt-0.5"
                  style={{ fontSize: 13 }}
                >
                  {formatKm(record.next_service_km)}
                </p>
              </div>
            )}
            <ChevronRight
              className="h-4 w-4 text-graphite group-hover:translate-x-0.5 transition-transform"
              strokeWidth={1.6}
            />
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full text-graphite hover:text-caution hover:bg-fog transition-colors"
                aria-label="Eliminar registro"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
