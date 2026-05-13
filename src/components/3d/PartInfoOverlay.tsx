import { X, PlusCircle, Wrench, ChevronRight } from 'lucide-react';
import { CAR_PARTS } from '../../utils/constants';
import type { MaintenanceRecord } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface Props {
  partKey: string;
  records: MaintenanceRecord[];
  onClose: () => void;
  onAddMaintenance: (type: string) => void;
}

const EYEBROW: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#a1a1a6',
  fontFamily: 'var(--font-mono)',
};

export const PartInfoOverlay = ({
  partKey, records, onClose, onAddMaintenance,
}: Props) => {
  const part = CAR_PARTS[partKey];
  if (!part) return null;

  const relevantRecords = records
    .filter((r) => part.maintenanceTypes.includes(r.type))
    .slice(0, 5);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 z-30"
        onClick={onClose}
        style={{
          background: 'rgba(20,22,28,0.42)',
          backdropFilter: 'blur(2px)',
          animation: 'fade-in 0.2s ease-out',
        }}
      />

      <aside
        className="absolute z-40 flex flex-col overflow-hidden md:right-4 md:top-4 md:bottom-4 md:w-[340px] inset-x-0 bottom-0 md:inset-auto top-auto max-h-[75vh] md:max-h-none"
        style={{
          background: '#ffffff',
          border: '1px solid #e8e8ed',
          borderRadius: 28,
          fontFamily: 'Inter, var(--font-sf-pro-text)',
          color: '#1d1d1f',
          animation: 'slide-in-right 0.3s var(--ease-out-expo)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between gap-3 px-5 py-5"
          style={{ borderBottom: '1px solid #e8e8ed' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: '#1d1d1f', color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Wrench size={20} strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <div style={EYEBROW}>Pieza · {partKey.split('_')[0]}</div>
              <div
                className="truncate font-semibold leading-tight"
                style={{
                  color: '#1d1d1f',
                  fontSize: 20,
                  letterSpacing: '-0.4px',
                  marginTop: 2,
                  fontFamily: 'Inter, var(--font-sf-pro-display)',
                }}
              >
                {part.label}
              </div>
              <div
                className="text-[12px] mt-0.5"
                style={{ color: '#707070' }}
              >
                {relevantRecords.length}{' '}
                {relevantRecords.length === 1 ? 'registro' : 'registros'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full transition-colors"
            style={{
              background: '#fff',
              border: '1px solid #e8e8ed',
              color: '#1d1d1f',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#fff';
            }}
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-none"
        >
          {/* ── History ──────────────────────────────────────────────── */}
          <section>
            <div style={EYEBROW} className="mb-3">
              Historial reciente
            </div>
            {relevantRecords.length === 0 ? (
              <div
                className="text-center px-4 py-6"
                style={{
                  background: '#f5f5f7',
                  border: '1px dashed #e8e8ed',
                  borderRadius: 16,
                }}
              >
                <p className="text-[13px]" style={{ color: '#707070' }}>
                  Sin registros para esta pieza.
                </p>
                <p
                  className="text-[11px] mt-1"
                  style={{ color: '#a1a1a6', fontFamily: 'var(--font-mono)' }}
                >
                  Añade el primero más abajo.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {relevantRecords.map((r) => (
                  <li
                    key={r.id}
                    className="p-3.5 transition-colors"
                    style={{
                      background: '#f5f5f7',
                      border: '1px solid #ececf0',
                      borderRadius: 16,
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span
                        className="font-medium leading-tight"
                        style={{ color: '#1d1d1f', fontSize: 14 }}
                      >
                        {r.type}
                      </span>
                      {r.cost ? (
                        <span
                          className="shrink-0 tabular-nums font-semibold"
                          style={{
                            color: '#1d1d1f',
                            fontSize: 13,
                          }}
                        >
                          {formatCurrency(r.cost)}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="flex items-center gap-2 mt-1.5 text-[11px]"
                      style={{
                        color: '#707070',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span>{formatDate(r.date)}</span>
                      <span style={{ color: '#d2d2d7' }}>·</span>
                      <span className="tabular-nums">
                        {r.km_at_service.toLocaleString('es-ES').replace(/\./g, ' ')} km
                      </span>
                    </div>
                    {r.description && (
                      <p
                        className="mt-2 line-clamp-2 leading-snug"
                        style={{ color: '#474747', fontSize: 12.5 }}
                      >
                        {r.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Quick add ─────────────────────────────────────────────── */}
          <section>
            <div style={EYEBROW} className="mb-3">
              Acciones rápidas
            </div>
            <div className="flex flex-col gap-1.5">
              {part.maintenanceTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => onAddMaintenance(type)}
                  className="group w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background: '#fff',
                    border: '1px solid #e8e8ed',
                    borderRadius: 14,
                    color: '#1d1d1f',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                    (e.currentTarget as HTMLElement).style.borderColor = '#d2d2d7';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                    (e.currentTarget as HTMLElement).style.borderColor = '#e8e8ed';
                  }}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      style={{
                        width: 28, height: 28, borderRadius: 999,
                        background: '#f5f5f7',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0071e3',
                        flexShrink: 0,
                      }}
                    >
                      <PlusCircle size={14} strokeWidth={1.8} />
                    </span>
                    <span className="truncate">{type}</span>
                  </span>
                  <ChevronRight
                    size={15}
                    strokeWidth={1.6}
                    style={{ color: '#a1a1a6', flexShrink: 0 }}
                  />
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
