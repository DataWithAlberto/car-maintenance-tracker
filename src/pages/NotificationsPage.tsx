import { useEffect, useState, useMemo } from 'react';
import { Bell, CheckCircle, AlertTriangle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { maintenanceService } from '../services/maintenance.service';
import { documentsService } from '../services/documents.service';
import { calculateAlerts, calculateDocumentAlerts } from '../utils/calculations';
import type { Alert, MaintenanceRecord, Document } from '../types';
import { SkeletonRow } from '../components/ui/Skeleton';
import { formatRelative } from '../utils/formatters';

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

const SEVERITY_META = {
  high: { icon: AlertCircle, color: '#b64400', bg: '#fff0e8', label: 'Alta' },
  medium: { icon: AlertTriangle, color: '#c77700', bg: '#fff8e1', label: 'Media' },
  low: { icon: Info, color: '#0071e3', bg: '#e8f4ff', label: 'Baja' },
};

export const NotificationsPage = () => {
  const { vehicles } = useVehicleStore();

  const [allAlerts, setAllAlerts] = useState<(Alert & { vehicleName: string })[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>('all');

  useEffect(() => {
    if (vehicles.length === 0) { setLoading(false); return; }
    setLoading(true);

    Promise.all(
      vehicles.map(async (v) => {
        const [records, documents] = await Promise.all([
          maintenanceService.getByVehicle(v.id).catch(() => [] as MaintenanceRecord[]),
          documentsService.getByVehicle(v.id).catch(() => [] as Document[]),
        ]);
        const alerts = [
          ...calculateAlerts(v, records),
          ...calculateDocumentAlerts(v.id, documents),
        ];
        return alerts.map((a) => ({ ...a, vehicleName: `${v.brand} ${v.model}` }));
      })
    ).then((results) => {
      const flat = results.flat();
      flat.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.severity ?? 'low'] ?? 2) - (order[b.severity ?? 'low'] ?? 2);
      });
      setAllAlerts(flat);
    }).finally(() => setLoading(false));
  }, [vehicles]);

  const visible = useMemo(() =>
    allAlerts.filter((a) => {
      if (dismissed.has(a.id)) return false;
      if (filter !== 'all' && a.severity !== filter) return false;
      return true;
    }),
    [allAlerts, dismissed, filter],
  );

  const counts = useMemo(() => ({
    high: allAlerts.filter((a) => a.severity === 'high' && !dismissed.has(a.id)).length,
    medium: allAlerts.filter((a) => a.severity === 'medium' && !dismissed.has(a.id)).length,
    low: allAlerts.filter((a) => a.severity === 'low' && !dismissed.has(a.id)).length,
  }), [allAlerts, dismissed]);

  const dismissOne = (id: string) => setDismissed((prev) => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(visible.map((a) => a.id)));

  return (
    <div style={{ padding: '20px 12px 80px', maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        @media (min-width: 640px) {
          .notif-container { padding: 28px 20px 80px; }
        }
        @media (min-width: 768px) {
          .notif-container { padding: 32px 24px 80px; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-graphite)', textTransform: 'uppercase', marginBottom: 6 }}>
            Centro de alertas
          </p>
          <h1 style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(24px, 5vw, 48px)', letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0, color: 'var(--color-ink)' }}>
            Notificaciones
          </h1>
        </div>
        {visible.length > 0 && (
          <button
            onClick={dismissAll}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', minHeight: 40, borderRadius: 8, border: '1px solid var(--color-silver-mist)', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--color-graphite)' }}
          >
            <CheckCircle size={14} />
            Leídas
          </button>
        )}
      </div>

      {/* Severity summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {(['high', 'medium', 'low'] as const).map((s) => {
          const meta = SEVERITY_META[s];
          const Icon = meta.icon;
          return (
            <div
              key={s}
              onClick={() => setFilter((f) => f === s ? 'all' : s)}
              style={{
                background: filter === s ? meta.bg : 'var(--color-snow)',
                border: `1px solid ${filter === s ? meta.color + '40' : 'var(--color-silver-mist)'}`,
                borderRadius: 12,
                padding: '12px 12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon size={14} color={meta.color} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color }}>{meta.label}</span>
              </div>
              <div style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(20px, 4vw, 28px)', color: 'var(--color-ink)' }}>
                {counts[s]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--color-mist)' }}>
          <CheckCircle size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <h3 style={{ fontWeight: 700, fontSize: 'clamp(16px, 4vw, 20px)', color: 'var(--color-ink)', marginBottom: 6 }}>Todo en orden</h3>
          <p style={{ fontSize: 'clamp(13px, 3vw, 15px)' }}>
            {allAlerts.length === 0
              ? 'No hay alertas activas para tus vehículos.'
              : 'Has revisado todas las alertas. ¡Buen trabajo!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map((alert) => {
            const meta = SEVERITY_META[alert.severity ?? 'low'];
            const Icon = meta.icon;
            return (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 12px',
                  borderRadius: 14,
                  background: 'var(--color-snow)',
                  border: '1px solid var(--color-silver-mist)',
                  borderLeft: `3px solid ${meta.color}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <Icon size={14} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 'clamp(13px, 3vw, 14px)', color: 'var(--color-ink)' }}>
                      {alert.vehicleName}
                    </span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {meta.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'var(--color-slate)', margin: 0, lineHeight: 1.4 }}>
                    {alert.description}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--color-mist)', margin: '4px 0 0' }}>
                    {formatRelative(alert.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => dismissOne(alert.id)}
                  style={{ flexShrink: 0, padding: 6, minHeight: 40, minWidth: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Descartar alerta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
