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
        className="bg-cloud-white border border-sky-blueprint/25 flex flex-col shadow-card"
        style={{
          position: 'fixed',
          right: 16,
          top: 16,
          bottom: 16,
          width: 320,
          borderRadius: 20,
          overflow: 'hidden',
          zIndex: 9999,
          animation: 'slide-in-right 0.3s var(--ease-out-expo)',
        }}
      >
        <header className="flex items-center justify-between p-5 border-b border-sky-blueprint/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-input bg-gradient-to-br from-sky-blueprint/20 to-sunset-orange/10 border border-sky-blueprint/30 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-sky-dark" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="font-manrope text-body text-ink-black font-semibold tracking-tight truncate">{part.label}</h3>
              <p className="font-manrope text-caption text-ink-charcoal/70">{relevantRecords.length} {relevantRecords.length === 1 ? 'registro' : 'registros'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg text-ink-charcoal hover:text-ink-black hover:bg-canvas-50 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* History */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Calendar className="h-3.5 w-3.5 text-ink-charcoal" />
              <h4 className="font-manrope text-caption text-ink-charcoal/70 tracking-wide font-semibold">Historial reciente</h4>
            </div>
            {relevantRecords.length === 0 ? (
              <div className="bg-canvas-50/40 border border-dashed border-sky-blueprint/25 rounded-input p-4 text-center">
                <p className="font-manrope text-caption text-ink-charcoal/70">Sin registros para esta parte</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {relevantRecords.map((r) => (
                  <li
                    key={r.id}
                    className="bg-canvas-50/60 border border-sky-blueprint/20 rounded-input p-3 hover:border-sky-blueprint/40 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-manrope text-body text-ink-black font-medium leading-tight">{r.type}</span>
                      {r.cost ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-sunset-orange font-manrope text-caption font-semibold tabular-nums">
                          <Receipt className="h-3 w-3" />
                          {formatCurrency(r.cost)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 font-manrope text-caption text-ink-charcoal/70 mt-1.5">
                      <span>{formatDate(r.date)}</span>
                      <span className="opacity-50">·</span>
                      <span className="tabular-nums">{r.km_at_service.toLocaleString()} km</span>
                    </div>
                    {r.description && (
                      <p className="font-manrope text-caption text-ink-charcoal/70 mt-1.5 line-clamp-2 leading-snug">{r.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick add */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <PlusCircle className="h-3.5 w-3.5 text-ink-charcoal" />
              <h4 className="font-manrope text-caption text-ink-charcoal/70 tracking-wide font-semibold">Acción rápida</h4>
            </div>
            <div className="space-y-1">
              {part.maintenanceTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onAddMaintenance(type)}
                  className="group w-full flex items-center justify-between text-left font-manrope text-body text-ink-black hover:text-ink-black hover:bg-sky-blueprint/10 rounded-input px-3 py-2.5 transition-all border border-transparent hover:border-sky-blueprint/30"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="h-7 w-7 rounded-input bg-canvas-50 group-hover:bg-sky-blueprint/15 flex items-center justify-center transition-colors">
                      <PlusCircle className="h-3.5 w-3.5 text-sky-dark" />
                    </span>
                    {type}
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink-charcoal/80 group-hover:text-sky-dark group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
