import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Battery,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  Phone,
  Printer,
  Shield,
  Thermometer,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { workshopService, type WorkshopView } from '../services/workshop.service';
import { printHtml } from '../utils/printHtml';
import { formatDate, formatKm } from '../utils/formatters';
import { predictFailuresWithOBD2 } from '../utils/failurePrediction';
import {
  buildWorkshopPriorityItems,
  deriveWorkshopStatus,
  workshopStatusLabel,
  type WorkshopPriorityItem,
  type WorkshopStatus,
} from '../utils/workshopDossier';
import type { FailurePrediction } from '../types';

const STATUS_STYLE: Record<WorkshopStatus, { bg: string; fg: string; dot: string; help: string }> = {
  critical: {
    bg: '#fce8e0',
    fg: '#b64400',
    dot: '#d70015',
    help: 'Hay incidencias que conviene revisar antes de circular con normalidad.',
  },
  soon: {
    bg: '#fdf1d9',
    fg: '#9a6700',
    dot: '#c77700',
    help: 'No hay bloqueo inmediato, pero hay elementos próximos a revisión.',
  },
  ok: {
    bg: '#e3f0e3',
    fg: '#2f6b34',
    dot: '#1a9e3f',
    help: 'No se detectan incidencias graves con los datos compartidos.',
  },
};

const SOURCE_LABEL: Record<WorkshopPriorityItem['source'], string> = {
  obd2: 'OBD',
  maintenance: 'Mantenimiento',
  document: 'Documento',
  insurance: 'Seguro',
};

const esc = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  );

const safeDate = (date?: string | null): string => (date ? formatDate(date) : 'Sin fecha');

const isOverdue = (iso?: string | null) => Boolean(iso && new Date(iso).getTime() < Date.now());

export const WorkshopPage = () => {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<WorkshopView | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(false);
  const missingToken = !token;

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      return;
    }
    workshopService
      .getView(token)
      .then((v) => {
        if (cancelled) return;
        if (v) setView(v);
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const predictions = useMemo<FailurePrediction[]>(
    () => (view ? predictFailuresWithOBD2(view.vehicle, view.records, view.obd2.readings) : []),
    [view],
  );

  const priorityItems = useMemo(
    () =>
      view
        ? buildWorkshopPriorityItems({
            anomalies: view.obd2.anomalies,
            predictions,
            documents: view.documents,
            insurance: view.insurance,
          })
        : [],
    [predictions, view],
  );

  const globalStatus = useMemo(() => deriveWorkshopStatus(priorityItems), [priorityItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center">
        <p className="font-text text-graphite" style={{ fontSize: 15 }}>
          Cargando dossier técnico…
        </p>
      </div>
    );
  }

  if (missingToken || error || !view) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="h-14 w-14 rounded-[16px] bg-snow border border-silver-mist flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6" style={{ color: '#b64400' }} strokeWidth={1.6} />
          </div>
          <h1
            className="font-display text-ink"
            style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.4px' }}
          >
            Enlace no válido
          </h1>
          <p className="font-text text-graphite mt-2" style={{ fontSize: 15, lineHeight: 1.45 }}>
            Este enlace de taller ha caducado o el propietario ha desactivado el acceso.
          </p>
        </div>
      </div>
    );
  }

  const { vehicle, records, documents, insurance, obd2 } = view;
  const statusStyle = STATUS_STYLE[globalStatus];
  const soonPredictions = predictions.filter((p) => p.status !== 'ok').slice(0, 6);
  const overdueDocuments = documents.filter((d) => isOverdue(d.expiry_date)).length;
  const nextServiceCount = records.filter(
    (r) =>
      (r.next_service_km != null && r.next_service_km <= vehicle.current_km) ||
      isOverdue(r.next_service_date),
  ).length;

  const handlePrint = () => {
    void printHtml(
      buildWorkshopPrintHtml({
        view,
        predictions: soonPredictions,
        priorityItems,
        status: globalStatus,
      }),
      `Dossier taller · ${vehicle.brand} ${vehicle.model}`,
    );
  };

  return (
    <div className="min-h-screen bg-fog">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 sm:py-12">
        <header className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <span
              className="inline-flex items-center gap-2 font-mono uppercase text-graphite"
              style={{ fontSize: 11, letterSpacing: '0.14em' }}
            >
              <Wrench className="h-3.5 w-3.5" strokeWidth={1.7} /> Dossier técnico · solo lectura
            </span>
            <h1
              className="text-ink"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 'clamp(38px, 6vw, 64px)',
                lineHeight: 1.02,
                letterSpacing: '-1px',
                margin: '12px 0 0',
              }}
            >
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="font-text text-graphite mt-3" style={{ fontSize: 15 }}>
              {vehicle.year}
              {vehicle.license_plate ? ` · ${vehicle.license_plate}` : ''}
              {vehicle.fuel_type ? ` · ${vehicle.fuel_type}` : ''}
              {vehicle.transmission ? ` · ${vehicle.transmission}` : ''}
              {vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}
            </p>
          </div>

          <div className="bg-snow border border-silver-mist rounded-[24px] p-5 min-w-[260px]">
            <div className="flex items-center gap-3">
              <span
                className="h-11 w-11 rounded-[14px] flex items-center justify-center"
                style={{ background: statusStyle.bg, color: statusStyle.fg }}
              >
                {globalStatus === 'critical' ? (
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
                ) : globalStatus === 'soon' ? (
                  <CalendarClock className="h-5 w-5" strokeWidth={1.8} />
                ) : (
                  <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
                )}
              </span>
              <div>
                <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  Estado técnico
                </p>
                <p className="font-display text-ink" style={{ fontWeight: 700, fontSize: 21 }}>
                  {workshopStatusLabel(globalStatus)}
                </p>
              </div>
            </div>
            <p className="font-text text-graphite mt-3" style={{ fontSize: 13, lineHeight: 1.45 }}>
              {statusStyle.help}
            </p>
            <Button
              variant="accent"
              size="sm"
              onClick={handlePrint}
              className="mt-4"
              iconLeft={<Printer className="h-4 w-4" strokeWidth={1.7} />}
            >
              Imprimir / PDF
            </Button>
          </div>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          <TriageCard icon={Gauge} label="Kilometraje" value={formatKm(vehicle.current_km)} />
          <TriageCard
            icon={Activity}
            label="Anomalías OBD"
            value={String(obd2.anomalies.length)}
            tone={obd2.anomalies.some((a) => a.severity === 'critical') ? 'critical' : obd2.anomalies.length > 0 ? 'soon' : 'ok'}
          />
          <TriageCard
            icon={Wrench}
            label="Mantenimiento pendiente"
            value={String(nextServiceCount + predictions.filter((p) => p.status === 'overdue').length)}
            tone={nextServiceCount > 0 || predictions.some((p) => p.status === 'overdue') ? 'critical' : soonPredictions.length > 0 ? 'soon' : 'ok'}
          />
          <TriageCard
            icon={FileText}
            label="Docs/seguro vencidos"
            value={String(overdueDocuments + (isOverdue(insurance?.end_date) ? 1 : 0))}
            tone={overdueDocuments > 0 || isOverdue(insurance?.end_date) ? 'critical' : 'ok'}
          />
        </section>

        <section className="grid lg:grid-cols-[1.2fr_.8fr] gap-5 mt-8">
          <Panel title="Qué revisar primero" icon={ClipboardList}>
            {priorityItems.length === 0 ? (
              <Empty>Sin prioridades urgentes con los datos compartidos.</Empty>
            ) : (
              <div className="space-y-3">
                {priorityItems.slice(0, 8).map((item) => (
                  <PriorityRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="OBD en vivo/histórico" icon={Activity}>
            {obd2.latest ? (
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Refrigerante" value={formatMaybe(obd2.latest.coolant_temp, '°C')} icon={Thermometer} />
                <Metric label="Batería" value={formatMaybe(obd2.latest.battery_voltage, 'V')} icon={Battery} />
                <Metric label="Carga motor" value={formatMaybe(obd2.latest.engine_load, '%')} icon={Activity} />
                <Metric label="Presión aceite" value={formatMaybe(obd2.latest.oil_pressure, 'kPa')} icon={Gauge} />
              </div>
            ) : (
              <Empty>Sin lecturas OBD compartidas.</Empty>
            )}
            {obd2.anomalies.length > 0 && (
              <div className="mt-4 space-y-2">
                {obd2.anomalies.slice(0, 5).map((a) => (
                  <div key={a.id ?? a.message} className="rounded-[14px] bg-fog px-4 py-3">
                    <p className="font-text text-ink font-medium" style={{ fontSize: 14 }}>
                      {a.message}
                    </p>
                    <p className="font-mono uppercase text-graphite mt-1" style={{ fontSize: 9, letterSpacing: '0.1em' }}>
                      {a.severity === 'critical' ? 'Crítica' : 'Aviso'} · {a.created_at ? safeDate(a.created_at) : 'sin fecha'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section className="grid lg:grid-cols-2 gap-5 mt-5">
          <Panel title="Predicción de componentes" icon={Wrench}>
            {soonPredictions.length === 0 ? (
              <Empty>No hay componentes vencidos o próximos según el historial.</Empty>
            ) : (
              <div className="space-y-3">
                {soonPredictions.map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between gap-3 mb-1">
                      <span className="font-text text-ink font-medium" style={{ fontSize: 14 }}>
                        {p.label}
                      </span>
                      <span className="font-mono text-graphite" style={{ fontSize: 11 }}>
                        {Math.round(p.lifeUsedPct)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-silver-mist overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, p.lifeUsedPct)}%`,
                          background: p.status === 'overdue' ? '#d70015' : '#c77700',
                        }}
                      />
                    </div>
                    <p className="font-text text-graphite mt-1" style={{ fontSize: 12 }}>
                      {p.kmRemaining <= 0
                        ? `Pasado por ${Math.abs(Math.round(p.kmRemaining)).toLocaleString('es-ES')} km`
                        : `Quedan ${Math.round(p.kmRemaining).toLocaleString('es-ES')} km`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Seguro y documentos importantes" icon={Shield}>
            {insurance ? (
              <div className="rounded-[16px] bg-fog p-4 mb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-text text-ink font-semibold" style={{ fontSize: 15 }}>
                      {insurance.provider}
                    </p>
                    <p className="font-text text-graphite mt-1" style={{ fontSize: 13 }}>
                      {insurance.coverage_type.replaceAll('_', ' ')} · {safeDate(insurance.start_date)} -{' '}
                      {safeDate(insurance.end_date)}
                    </p>
                  </div>
                  {insurance.contact_phone && (
                    <a
                      href={`tel:${insurance.contact_phone}`}
                      className="inline-flex items-center gap-1.5 font-text text-azure font-medium"
                      style={{ fontSize: 13 }}
                    >
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.7} />
                      Llamar
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <Empty>Sin seguro compartido.</Empty>
            )}

            {documents.length === 0 ? (
              <Empty>Sin documentos importantes.</Empty>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-[14px] bg-fog px-4 py-3 hover:bg-silver-mist/50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block font-text text-ink font-medium truncate" style={{ fontSize: 14 }}>
                        {doc.doc_type}
                      </span>
                      <span className="block font-text text-graphite truncate" style={{ fontSize: 12 }}>
                        {doc.file_name ?? 'Documento'} ·{' '}
                        {doc.expiry_date ? `vence ${safeDate(doc.expiry_date)}` : 'sin vencimiento'}
                      </span>
                    </span>
                    <FileText className="h-4 w-4 text-graphite shrink-0" strokeWidth={1.7} />
                  </a>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <Panel title="Historial técnico de mantenimiento" icon={Wrench} className="mt-5">
          {records.length === 0 ? (
            <Empty>Sin registros de mantenimiento compartidos.</Empty>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="bg-fog rounded-[16px] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-text text-ink font-semibold" style={{ fontSize: 15 }}>
                        {r.type}
                      </p>
                      <p className="font-text text-graphite mt-1" style={{ fontSize: 13, lineHeight: 1.45 }}>
                        {safeDate(r.date)} · {formatKm(r.km_at_service)}
                        {r.description ? ` · ${r.description}` : ''}
                      </p>
                    </div>
                    {(r.next_service_km || r.next_service_date) && (
                      <span
                        className="shrink-0 rounded-full bg-snow border border-silver-mist px-3 py-1 font-mono uppercase text-graphite"
                        style={{ fontSize: 9, letterSpacing: '0.08em' }}
                      >
                        Próx. {r.next_service_km ? formatKm(r.next_service_km) : safeDate(r.next_service_date)}
                      </span>
                    )}
                  </div>
                  {r.parts_location && (
                    <p className="font-text text-graphite mt-2" style={{ fontSize: 12 }}>
                      Ubicación/piezas: {r.parts_location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <footer className="mt-10 pt-6 border-t border-silver-mist flex items-center gap-2">
          <Car className="h-4 w-4 text-graphite" strokeWidth={1.6} />
          <span className="font-text text-graphite" style={{ fontSize: 12.5 }}>
            Dossier generado por FocusHub. No incluye importes personales, tickets ni datos financieros.
          </span>
        </footer>
      </div>
    </div>
  );
};

const TriageCard = ({
  icon: Icon,
  label,
  value,
  tone = 'ok',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: WorkshopStatus;
}) => {
  const style = STATUS_STYLE[tone];
  return (
    <div className="bg-snow border border-silver-mist rounded-[20px] p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full" style={{ width: 7, height: 7, background: style.dot }} />
        <span className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-graphite ml-auto" strokeWidth={1.6} />
      </div>
      <p className="font-display text-ink tabular-nums mt-3" style={{ fontWeight: 700, fontSize: 24 }}>
        {value}
      </p>
    </div>
  );
};

const Panel = ({
  icon: Icon,
  title,
  children,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`bg-snow border border-silver-mist rounded-[28px] p-6 ${className}`}>
    <h2
      className="inline-flex items-center gap-2 font-mono uppercase text-graphite mb-5"
      style={{ fontSize: 11, letterSpacing: '0.14em' }}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} /> {title}
    </h2>
    {children}
  </section>
);

const PriorityRow = ({ item }: { item: WorkshopPriorityItem }) => {
  const style = STATUS_STYLE[item.status];
  return (
    <div className="rounded-[16px] bg-fog p-4 border border-transparent">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-2 w-2 rounded-full" style={{ background: style.dot }} />
        <span className="font-mono uppercase text-graphite" style={{ fontSize: 9, letterSpacing: '0.1em' }}>
          {SOURCE_LABEL[item.source]}
        </span>
      </div>
      <p className="font-text text-ink font-semibold" style={{ fontSize: 15 }}>
        {item.title}
      </p>
      <p className="font-text text-graphite mt-1" style={{ fontSize: 13, lineHeight: 1.45 }}>
        {item.detail}
      </p>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="bg-fog rounded-[16px] p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-graphite" strokeWidth={1.7} />
      <span className="font-mono uppercase text-graphite" style={{ fontSize: 9, letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
    <p className="font-display text-ink tabular-nums" style={{ fontWeight: 700, fontSize: 20 }}>
      {value}
    </p>
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div
    className="bg-fog rounded-[14px] text-center font-text text-graphite"
    style={{ padding: '20px', fontSize: 14 }}
  >
    {children}
  </div>
);

const formatMaybe = (value: number | null | undefined, unit: string): string =>
  value == null ? '—' : `${Number(value).toLocaleString('es-ES')} ${unit}`;

const buildWorkshopPrintHtml = ({
  view,
  predictions,
  priorityItems,
  status,
}: {
  view: WorkshopView;
  predictions: FailurePrediction[];
  priorityItems: WorkshopPriorityItem[];
  status: WorkshopStatus;
}): string => {
  const { vehicle, records, documents, insurance, obd2 } = view;
  const priorityRows = priorityItems.length
    ? priorityItems
        .map(
          (item) => `
            <tr>
              <td>${esc(SOURCE_LABEL[item.source])}</td>
              <td>${esc(item.title)}</td>
              <td>${esc(item.detail)}</td>
              <td>${esc(workshopStatusLabel(item.status))}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="empty">Sin prioridades urgentes</td></tr>';
  const recordRows = records.length
    ? records
        .map(
          (r) => `
            <tr>
              <td>${esc(safeDate(r.date))}</td>
              <td>${esc(r.type)}</td>
              <td class="num">${esc(formatKm(r.km_at_service))}</td>
              <td>${esc(r.description ?? '—')}</td>
              <td>${esc(r.next_service_km ? formatKm(r.next_service_km) : safeDate(r.next_service_date))}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="empty">Sin registros de mantenimiento</td></tr>';
  const predictionRows = predictions.length
    ? predictions
        .map(
          (p) => `
            <tr>
              <td>${esc(p.label)}</td>
              <td class="num">${Math.round(p.lifeUsedPct)}%</td>
              <td>${esc(p.kmRemaining <= 0 ? `Pasado por ${Math.abs(Math.round(p.kmRemaining)).toLocaleString('es-ES')} km` : `Quedan ${Math.round(p.kmRemaining).toLocaleString('es-ES')} km`)}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="empty">Sin componentes vencidos o próximos</td></tr>';
  const docRows = documents.length
    ? documents
        .map(
          (d) => `
            <tr>
              <td>${esc(d.doc_type)}</td>
              <td>${esc(d.file_name ?? 'Documento')}</td>
              <td>${esc(d.expiry_date ? safeDate(d.expiry_date) : 'Sin vencimiento')}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="empty">Sin documentos importantes</td></tr>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Dossier taller · ${esc(vehicle.brand)} ${esc(vehicle.model)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1d1d1f; padding: 42px; line-height: 1.45; }
  .eyebrow { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #707070; }
  h1 { font-size: 34px; letter-spacing: -.6px; margin: 8px 0 4px; }
  h2 { font-size: 16px; margin: 30px 0 10px; }
  .meta, .small { color: #707070; font-size: 12.5px; }
  .status { display: inline-block; margin-top: 18px; border: 1px solid #e8e8ed; border-radius: 14px; padding: 12px 14px; font-weight: 700; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #e8e8ed; border: 1px solid #e8e8ed; border-radius: 14px; overflow: hidden; margin-top: 22px; }
  .kpi { background: #fff; padding: 14px; }
  .kpi .label { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: #707070; }
  .kpi .value { font-size: 18px; font-weight: 700; margin-top: 5px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: #707070; padding: 7px 8px; border-bottom: 1.5px solid #1d1d1f; }
  td { padding: 8px; border-bottom: 1px solid #e8e8ed; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: #a1a1a6; text-align: center; padding: 14px; }
  @page { margin: 14mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <span class="eyebrow">Dossier técnico de taller · FocusHub</span>
  <h1>${esc(vehicle.brand)} ${esc(vehicle.model)}</h1>
  <p class="meta">${esc(vehicle.year)}${vehicle.license_plate ? ` · ${esc(vehicle.license_plate)}` : ''}${vehicle.fuel_type ? ` · ${esc(vehicle.fuel_type)}` : ''}${vehicle.vin ? ` · VIN ${esc(vehicle.vin)}` : ''}</p>
  <div class="status">${esc(workshopStatusLabel(status))}</div>
  <div class="kpis">
    <div class="kpi"><div class="label">Kilometraje</div><div class="value">${esc(formatKm(vehicle.current_km))}</div></div>
    <div class="kpi"><div class="label">Anomalías OBD</div><div class="value">${obd2.anomalies.length}</div></div>
    <div class="kpi"><div class="label">Mantenimientos</div><div class="value">${records.length}</div></div>
    <div class="kpi"><div class="label">Actualizado</div><div class="value">${esc(safeDate(vehicle.updated_at))}</div></div>
  </div>

  <h2>Qué revisar primero</h2>
  <table><thead><tr><th>Origen</th><th>Elemento</th><th>Detalle</th><th>Estado</th></tr></thead><tbody>${priorityRows}</tbody></table>

  <h2>OBD</h2>
  <p class="small">Última lectura: refrigerante ${esc(formatMaybe(obd2.latest?.coolant_temp, '°C'))}, batería ${esc(formatMaybe(obd2.latest?.battery_voltage, 'V'))}, carga motor ${esc(formatMaybe(obd2.latest?.engine_load, '%'))}, presión aceite ${esc(formatMaybe(obd2.latest?.oil_pressure, 'kPa'))}.</p>

  <h2>Predicción de componentes</h2>
  <table><thead><tr><th>Componente</th><th class="num">Vida usada</th><th>Detalle</th></tr></thead><tbody>${predictionRows}</tbody></table>

  <h2>Historial técnico</h2>
  <table><thead><tr><th>Fecha</th><th>Tipo</th><th class="num">Km</th><th>Descripción</th><th>Próximo</th></tr></thead><tbody>${recordRows}</tbody></table>

  <h2>Seguro y documentos importantes</h2>
  <p class="small">Seguro: ${insurance ? `${esc(insurance.provider)} · ${esc(insurance.coverage_type)} · ${esc(safeDate(insurance.start_date))} - ${esc(safeDate(insurance.end_date))}` : 'Sin seguro compartido'}</p>
  <table><thead><tr><th>Tipo</th><th>Archivo</th><th>Vencimiento</th></tr></thead><tbody>${docRows}</tbody></table>

  <p class="small" style="margin-top: 30px;">No incluye importes personales, tickets, primas ni datos financieros. Generado el ${esc(new Date().toLocaleString('es-ES'))}.</p>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
};
