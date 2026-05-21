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
    <div style={{ padding: '32px 24px 80px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-graphite)', textTransform: 'uppercase', marginBottom: 8 }}>
            Centro de alertas
          </p>
          <h1 style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(32px,5vw,48px)', letterSpacing: '-1px', lineHeight: 1, margin: 0, color: 'var(--color-ink)' }}>
            Notificaciones
          </h1>
        </div>
        {visible.length > 0 && (
          <button
            onClick={dismissAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--color-silver-mist)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-graphite)' }}
          >
            <CheckCircle size={14} />
            Marcar todas leídas
          </button>
        )}
      </div>

      {/* Severity summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
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
                borderRadius: 14,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon size={16} color={meta.color} />
                <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
              </div>
              <div style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 28, color: 'var(--color-ink)' }}>
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
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-mist)' }}>
          <CheckCircle size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-ink)', marginBottom: 8 }}>Todo en orden</h3>
          <p style={{ fontSize: 15 }}>
            {allAlerts.length === 0
              ? 'No hay alertas activas para tus vehículos.'
              : 'Has revisado todas las alertas. ¡Buen trabajo!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((alert) => {
            const meta = SEVERITY_META[alert.severity ?? 'low'];
            const Icon = meta.icon;
            return (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: 'var(--color-snow)',
                  border: '1px solid var(--color-silver-mist)',
                  borderLeft: `3px solid ${meta.color}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <Icon size={16} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>
                      {alert.vehicleName}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {meta.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--color-slate)', margin: 0, lineHeight: 1.45 }}>
                    {alert.description}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-mist)', margin: '6px 0 0' }}>
                    {formatRelative(alert.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => dismissOne(alert.id)}
                  style={{ flexShrink: 0, padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-mist)', marginTop: 2 }}
                  aria-label="Descartar alerta"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
