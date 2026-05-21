import { X, ChevronRight, Calendar, Receipt } from 'lucide-react';
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
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
      />

      <aside
        className="bg-snow border border-silver-mist flex flex-col"
        style={{
          position: 'fixed',
          right: 16,
          top: 16,
          bottom: 16,
          width: 320,
          borderRadius: 20,
          overflow: 'hidden',
          zIndex: 9999,
          animation: 'slide-in-right 0.25s ease-out',
        }}
      >
        {/* Header */}
        <header className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-silver-mist">
          <div className="min-w-0 pr-3">
            <span className="eyebrow">Componente</span>
            <h3
              className="text-ink mt-1"
              style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.4px' }}
            >
              {part.label}
            </h3>
            <p className="font-text text-graphite mt-1" style={{ fontSize: 13 }}>
              {relevantRecords.length} {relevantRecords.length === 1 ? 'registro' : 'registros'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full bg-fog hover:bg-silver-mist transition-colors text-ink"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Historial */}
          <section className="px-5 pt-5 pb-4">
            <h4
              className="font-mono uppercase text-graphite mb-3 flex items-center gap-1.5"
              style={{ fontSize: 11, letterSpacing: '0.14em' }}
            >
              <Calendar className="h-3 w-3" strokeWidth={1.6} />
              Historial reciente
            </h4>

            {relevantRecords.length === 0 ? (
              <div className="bg-fog border border-silver-mist rounded-[14px] p-4 text-center">
                <p className="font-text text-graphite" style={{ fontSize: 14 }}>
                  Sin registros para esta parte
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {relevantRecords.map((r) => (
                  <li
                    key={r.id}
                    className="bg-fog border border-silver-mist rounded-[14px] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-text text-ink font-medium leading-tight" style={{ fontSize: 14 }}>
                        {r.type}
                      </span>
                      {r.cost ? (
                        <span className="shrink-0 inline-flex items-center gap-1 font-text text-graphite tabular-nums" style={{ fontSize: 13 }}>
                          <Receipt className="h-3 w-3" strokeWidth={1.6} />
                          {formatCurrency(r.cost)}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-text text-graphite mt-1 tabular-nums" style={{ fontSize: 12 }}>
                      {formatDate(r.date)} · {r.km_at_service.toLocaleString()} km
                    </p>
                    {r.description && (
                      <p className="font-text text-graphite mt-1 line-clamp-2" style={{ fontSize: 12 }}>
                        {r.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Acciones */}
          <section className="px-5 pb-5 border-t border-silver-mist pt-4">
            <h4
              className="font-mono uppercase text-graphite mb-3"
              style={{ fontSize: 11, letterSpacing: '0.14em' }}
            >
              Añadir registro
            </h4>
            <div className="space-y-1">
              {part.maintenanceTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onAddMaintenance(type)}
                  className="w-full flex items-center justify-between text-left px-4 py-3 rounded-[14px] bg-fog border border-silver-mist hover:bg-silver-mist transition-colors group"
                >
                  <span className="font-text text-ink font-medium" style={{ fontSize: 14 }}>
                    {type}
                  </span>
                  <ChevronRight className="h-4 w-4 text-graphite group-hover:text-ink transition-colors" strokeWidth={1.6} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
