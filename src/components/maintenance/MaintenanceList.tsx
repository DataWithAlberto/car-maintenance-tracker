import { Wrench, Trash2, ChevronRight, Calendar, Gauge, Receipt } from 'lucide-react';
import type { MaintenanceRecord } from '../../types';
import { formatDate, formatCurrency, formatKm } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';

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
          className="group bg-cloud-white border border-sky-blueprint/20 hover:border-brand-400/40 rounded-card p-4 flex items-center gap-4 transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 border border-sky-blueprint/30 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-sky-dark" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-ink-black font-medium truncate tracking-tight">{record.type}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink-charcoal">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(record.date)}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Gauge className="h-3 w-3" />
                {formatKm(record.km_at_service)}
              </span>
              {record.cost ? (
                <span className="inline-flex items-center gap-1 text-accent-400 font-semibold tabular-nums">
                  <Receipt className="h-3 w-3" />
                  {formatCurrency(record.cost)}
                </span>
              ) : null}
            </div>
            {record.description && (
              <p className="text-ink-charcoal text-xs mt-1.5 line-clamp-1">{record.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {record.next_service_km && (
              <div className="text-right hidden sm:block px-2 py-1 rounded-lg bg-warn-500/10 border border-warn-500/30">
                <p className="text-[9px] uppercase tracking-wider text-warn-400/80 font-medium">Próximo</p>
                <p className="text-xs text-warn-400 tabular-nums font-semibold">{formatKm(record.next_service_km)}</p>
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-ink-charcoal/80 group-hover:text-sky-dark group-hover:translate-x-0.5 transition-all" />
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                className="text-ink-charcoal/80 hover:text-danger-400 hover:bg-danger-500/10 rounded-md p-1.5 -mr-1 transition-colors"
                aria-label="Eliminar registro"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
