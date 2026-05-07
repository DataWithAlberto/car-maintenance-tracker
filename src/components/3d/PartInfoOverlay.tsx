import { X, PlusCircle, Wrench, Calendar, Receipt, ChevronRight } from 'lucide-react';
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
        className="md:hidden fixed inset-0 bg-black/50 z-30"
        onClick={onClose}
        style={{ animation: 'fade-in 0.2s ease-out' }}
      />

      <aside
        className="absolute md:right-4 md:top-4 md:bottom-4 md:w-80 inset-x-0 bottom-0 md:inset-auto top-auto max-h-[75vh] md:max-h-none glass-strong border border-border md:rounded-2xl rounded-t-3xl flex flex-col overflow-hidden shadow-2xl shadow-black/50 z-40"
        style={{ animation: 'slide-in-right 0.3s var(--ease-out-expo)' }}
      >
        <header className="flex items-center justify-between p-5 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/10 border border-brand-400/30 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-brand-300" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold tracking-tight truncate">{part.label}</h3>
              <p className="text-gray-500 text-xs">{relevantRecords.length} {relevantRecords.length === 1 ? 'registro' : 'registros'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-surface-2 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* History */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Calendar className="h-3.5 w-3.5 text-gray-500" />
              <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Historial reciente</h4>
            </div>
            {relevantRecords.length === 0 ? (
              <div className="bg-surface-2/40 border border-dashed border-border rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs">Sin registros para esta parte</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {relevantRecords.map((r) => (
                  <li
                    key={r.id}
                    className="bg-surface-2/60 border border-border/60 rounded-xl p-3 hover:border-brand-400/30 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-white text-sm font-medium leading-tight">{r.type}</span>
                      {r.cost ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-accent-400 text-xs font-semibold tabular-nums">
                          <Receipt className="h-3 w-3" />
                          {formatCurrency(r.cost)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mt-1.5">
                      <span>{formatDate(r.date)}</span>
                      <span className="opacity-50">·</span>
                      <span className="tabular-nums">{r.km_at_service.toLocaleString()} km</span>
                    </div>
                    {r.description && (
                      <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 leading-snug">{r.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick add */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <PlusCircle className="h-3.5 w-3.5 text-gray-500" />
              <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Acción rápida</h4>
            </div>
            <div className="space-y-1">
              {part.maintenanceTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onAddMaintenance(type)}
                  className="group w-full flex items-center justify-between text-left text-sm text-gray-300 hover:text-white hover:bg-brand-500/10 rounded-lg px-3 py-2.5 transition-all border border-transparent hover:border-brand-500/30"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="h-7 w-7 rounded-lg bg-surface-2 group-hover:bg-brand-500/20 flex items-center justify-center transition-colors">
                      <PlusCircle className="h-3.5 w-3.5 text-brand-300" />
                    </span>
                    {type}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-brand-300 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
