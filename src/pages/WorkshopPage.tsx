import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Wrench, FileText, Receipt, Car, AlertTriangle } from 'lucide-react';
import { workshopService, type WorkshopView } from '../services/workshop.service';
import { formatDate, formatCurrency, formatKm } from '../utils/formatters';

export const WorkshopPage = () => {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<WorkshopView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return; }
    workshopService.getView(token)
      .then((v) => { if (v) setView(v); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center">
        <p className="font-text text-graphite" style={{ fontSize: 15 }}>Cargando ficha…</p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="h-14 w-14 rounded-[16px] bg-snow border border-silver-mist flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6" style={{ color: '#b64400' }} strokeWidth={1.6} />
          </div>
          <h1 className="font-display text-ink" style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.4px' }}>
            Enlace no válido
          </h1>
          <p className="font-text text-graphite mt-2" style={{ fontSize: 15, lineHeight: 1.45 }}>
            Este enlace de taller ha caducado o el propietario ha desactivado el acceso.
          </p>
        </div>
      </div>
    );
  }

  const { vehicle, records, expenses, documents } = view;
  const maintCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);
  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-fog">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12">
        {/* Header */}
        <header>
          <span
            className="inline-flex items-center gap-2 font-mono uppercase text-graphite"
            style={{ fontSize: 11, letterSpacing: '0.14em' }}
          >
            <Wrench className="h-3.5 w-3.5" strokeWidth={1.7} /> Ficha de taller · solo lectura
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(36px, 6vw, 52px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="font-text text-graphite mt-2" style={{ fontSize: 15 }}>
            {vehicle.year}
            {vehicle.license_plate ? ` · ${vehicle.license_plate}` : ''}
            {vehicle.fuel_type ? ` · ${vehicle.fuel_type}` : ''}
            {vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}
          </p>
        </header>

        {/* KPI strip */}
        <div
          className="mt-7 rounded-[20px] overflow-hidden border border-silver-mist"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--color-silver-mist)' }}
        >
          {([
            ['KILOMETRAJE', formatKm(vehicle.current_km)],
            ['MANTENIMIENTOS', String(records.length)],
            ['COSTE TOTAL', formatCurrency(maintCost + expTotal)],
          ] as const).map(([label, value]) => (
            <div key={label} className="bg-snow" style={{ padding: '16px 18px' }}>
              <div className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                {label}
              </div>
              <div
                className="font-display text-ink tabular-nums"
                style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px', marginTop: 6 }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Maintenance */}
        <Section icon={Wrench} title="Historial de mantenimiento">
          {records.length === 0 ? (
            <Empty>Sin registros de mantenimiento</Empty>
          ) : (
            <ul className="space-y-2">
              {records.map((r) => (
                <li key={r.id} className="bg-snow border border-silver-mist rounded-[14px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-text text-ink font-medium" style={{ fontSize: 15 }}>{r.type}</span>
                    <span className="font-display text-ink tabular-nums" style={{ fontSize: 15, fontWeight: 600 }}>
                      {r.cost != null ? formatCurrency(r.cost) : '—'}
                    </span>
                  </div>
                  <div className="font-text text-graphite mt-1" style={{ fontSize: 13 }}>
                    {formatDate(r.date)} · {formatKm(r.km_at_service)}
                    {r.description ? ` · ${r.description}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Expenses */}
        <Section icon={Receipt} title="Gastos registrados">
          {expenses.length === 0 ? (
            <Empty>Sin gastos registrados</Empty>
          ) : (
            <ul className="space-y-2">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center justify-between gap-3"
                >
                  <span className="font-text text-ink font-medium" style={{ fontSize: 15 }}>
                    {e.category}
                    <span className="text-graphite font-normal"> · {formatDate(e.date)}</span>
                  </span>
                  <span className="font-display text-ink tabular-nums" style={{ fontSize: 15, fontWeight: 600 }}>
                    {formatCurrency(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Documents */}
        <Section icon={FileText} title="Documentos">
          {documents.length === 0 ? (
            <Empty>Sin documentos</Empty>
          ) : (
            <ul className="space-y-2">
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center justify-between gap-3"
                >
                  <span className="font-text text-ink font-medium" style={{ fontSize: 15 }}>
                    {d.doc_type}
                    {d.file_name ? <span className="text-graphite font-normal"> · {d.file_name}</span> : null}
                  </span>
                  <span className="font-text text-graphite" style={{ fontSize: 13 }}>
                    {d.expiry_date ? `Vence ${formatDate(d.expiry_date)}` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <footer className="mt-12 pt-6 border-t border-silver-mist flex items-center gap-2">
          <Car className="h-4 w-4 text-graphite" strokeWidth={1.6} />
          <span className="font-text text-graphite" style={{ fontSize: 12.5 }}>
            Ficha generada por FocusHub · acceso de solo lectura compartido por el propietario.
          </span>
        </footer>
      </div>
    </div>
  );
};

const Section = ({ icon: Icon, title, children }: {
  icon: typeof Wrench; title: string; children: React.ReactNode;
}) => (
  <section className="mt-10">
    <h2
      className="inline-flex items-center gap-2 font-mono uppercase text-graphite mb-4"
      style={{ fontSize: 11, letterSpacing: '0.14em' }}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} /> {title}
    </h2>
    {children}
  </section>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div
    className="bg-snow border border-silver-mist rounded-[14px] text-center font-text text-graphite"
    style={{ padding: '20px', fontSize: 14 }}
  >
    {children}
  </div>
);
