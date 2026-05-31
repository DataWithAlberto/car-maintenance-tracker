import type {
  Vehicle,
  MaintenanceRecord,
  Expense,
  Document,
  OBD2Reading,
  OBD2Anomaly,
} from '../types';
import { printHtml } from '../utils/printHtml';

const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  );

// Instancias únicas a nivel de módulo: un export de 200 registros llama a
// fmtEur/fmtKm/fmtDate cientos de veces; construir Intl.NumberFormat o
// Intl.DateTimeFormat en cada llamada es uno de los hot-spots más caros
// del runtime (carga ICU + negociación de locale por instancia).
const FMT_EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const FMT_KM = new Intl.NumberFormat('es-ES');
const FMT_DATE = new Intl.DateTimeFormat('es-ES');

const fmtDate = (d: string): string => FMT_DATE.format(new Date(d));
const fmtEur = (n: number): string => FMT_EUR.format(n);
const fmtKm = (n: number): string => `${FMT_KM.format(n)} km`;

export const exportService = {
  exportVehicleReport(
    vehicle: Vehicle,
    records: MaintenanceRecord[],
    expenses: Expense[],
    documents: Document[],
  ): void {
    const maintCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);
    const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const generatedAt = new Date().toLocaleString('es-ES');

    const recordsSorted = [...records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const expensesSorted = [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const maintRows = recordsSorted.length
      ? recordsSorted
          .map(
            (r) => `
        <tr>
          <td>${esc(fmtDate(r.date))}</td>
          <td>${esc(r.type)}</td>
          <td class="num">${esc(fmtKm(r.km_at_service))}</td>
          <td class="num">${r.cost != null ? esc(fmtEur(r.cost)) : '—'}</td>
          <td>${esc(r.description ?? '—')}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="5" class="empty">Sin registros</td></tr>';

    const expenseRows = expensesSorted.length
      ? expensesSorted
          .map(
            (e) => `
        <tr>
          <td>${esc(fmtDate(e.date))}</td>
          <td>${esc(e.category)}</td>
          <td class="num">${esc(fmtEur(e.amount))}</td>
          <td>${esc(e.description ?? '—')}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="4" class="empty">Sin registros</td></tr>';

    const docRows = documents.length
      ? documents
          .map(
            (d) => `
        <tr>
          <td>${esc(d.doc_type)}</td>
          <td>${esc(d.file_name ?? '—')}</td>
          <td>${d.expiry_date ? esc(fmtDate(d.expiry_date)) : '—'}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="3" class="empty">Sin documentos</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe · ${esc(vehicle.brand)} ${esc(vehicle.model)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1d1d1f; padding: 48px; line-height: 1.5;
  }
  .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #707070; }
  h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.6px; margin: 6px 0 2px; }
  h2 { font-size: 16px; font-weight: 600; margin: 36px 0 12px; }
  .meta { font-size: 13px; color: #707070; }
  .kpis { display: flex; gap: 32px; margin-top: 24px; padding: 20px 0; border-top: 1px solid #e8e8ed; border-bottom: 1px solid #e8e8ed; }
  .kpi .label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #707070; }
  .kpi .value { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #707070; padding: 8px 10px; border-bottom: 1.5px solid #1d1d1f; }
  td { padding: 8px 10px; border-bottom: 1px solid #e8e8ed; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  .empty { color: #a1a1a6; text-align: center; padding: 16px; }
  .footer { margin-top: 40px; font-size: 11px; color: #a1a1a6; }
  @media print { body { padding: 24px; } @page { margin: 16mm; } }
</style>
</head>
<body>
  <span class="eyebrow">Informe del vehículo · FocusHub</span>
  <h1>${esc(vehicle.brand)} ${esc(vehicle.model)}</h1>
  <p class="meta">
    ${esc(vehicle.year)}${vehicle.license_plate ? ` · ${esc(vehicle.license_plate)}` : ''}${vehicle.vin ? ` · VIN ${esc(vehicle.vin)}` : ''}
  </p>

  <div class="kpis">
    <div class="kpi"><div class="label">Kilometraje</div><div class="value">${esc(fmtKm(vehicle.current_km))}</div></div>
    <div class="kpi"><div class="label">Mantenimientos</div><div class="value">${records.length}</div></div>
    <div class="kpi"><div class="label">Coste mantenimiento</div><div class="value">${esc(fmtEur(maintCost))}</div></div>
    <div class="kpi"><div class="label">Gastos registrados</div><div class="value">${esc(fmtEur(expTotal))}</div></div>
  </div>

  <h2>Historial de mantenimiento</h2>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Tipo</th><th class="num">Km</th><th class="num">Coste</th><th>Descripción</th>
    </tr></thead>
    <tbody>${maintRows}</tbody>
  </table>

  <h2>Gastos</h2>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Categoría</th><th class="num">Importe</th><th>Descripción</th>
    </tr></thead>
    <tbody>${expenseRows}</tbody>
  </table>

  <h2>Documentos</h2>
  <table>
    <thead><tr>
      <th>Tipo</th><th>Archivo</th><th>Vencimiento</th>
    </tr></thead>
    <tbody>${docRows}</tbody>
  </table>

  <p class="footer">Generado el ${esc(generatedAt)} · FocusHub</p>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

    void printHtml(html, 'Informe');
  },

  exportTaxReport(
    vehicle: Vehicle,
    expenses: Expense[],
    records: MaintenanceRecord[],
    year: number,
  ): void {
    const inYear = (d: string): boolean => new Date(d).getFullYear() === year;

    const cats: Record<string, number> = {};
    expenses
      .filter((e) => inYear(e.date))
      .forEach((e) => {
        cats[e.category] = (cats[e.category] ?? 0) + e.amount;
      });
    const maintCost = records.filter((r) => inYear(r.date)).reduce((s, r) => s + (r.cost ?? 0), 0);
    if (maintCost > 0) cats['Mantenimiento'] = (cats['Mantenimiento'] ?? 0) + maintCost;

    const rows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((s, [, v]) => s + v, 0);
    const generatedAt = new Date().toLocaleString('es-ES');

    const catRows = rows.length
      ? rows
          .map(
            ([name, value]) => `
        <tr>
          <td>${esc(name)}</td>
          <td class="num">${esc(fmtEur(value))}</td>
          <td class="num">${total > 0 ? Math.round((value / total) * 100) : 0}%</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="3" class="empty">Sin gastos este año</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe fiscal ${year} · ${esc(vehicle.brand)} ${esc(vehicle.model)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1d1d1f; padding: 48px; line-height: 1.5; }
  .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #707070; }
  h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.6px; margin: 6px 0 2px; }
  .meta { font-size: 13px; color: #707070; }
  .total { margin-top: 24px; padding: 20px 0; border-top: 1px solid #e8e8ed; border-bottom: 1px solid #e8e8ed; }
  .total .label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #707070; }
  .total .value { font-size: 36px; font-weight: 700; letter-spacing: -0.5px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 28px; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #707070; padding: 8px 10px; border-bottom: 1.5px solid #1d1d1f; }
  td { padding: 8px 10px; border-bottom: 1px solid #e8e8ed; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: #a1a1a6; text-align: center; padding: 16px; }
  .footer { margin-top: 40px; font-size: 11px; color: #a1a1a6; }
  @media print { body { padding: 24px; } @page { margin: 16mm; } }
</style>
</head>
<body>
  <span class="eyebrow">Informe fiscal · ejercicio ${year} · FocusHub</span>
  <h1>${esc(vehicle.brand)} ${esc(vehicle.model)}</h1>
  <p class="meta">
    ${esc(vehicle.year)}${vehicle.license_plate ? ` · ${esc(vehicle.license_plate)}` : ''}${vehicle.vin ? ` · VIN ${esc(vehicle.vin)}` : ''}
  </p>

  <div class="total">
    <div class="label">Gasto total deducible · ${year}</div>
    <div class="value">${esc(fmtEur(total))}</div>
  </div>

  <table>
    <thead><tr>
      <th>Categoría</th><th class="num">Importe</th><th class="num">% del total</th>
    </tr></thead>
    <tbody>${catRows}</tbody>
  </table>

  <p class="footer">
    Generado el ${esc(generatedAt)} · FocusHub.
    Documento orientativo — no sustituye al asesoramiento de un profesional fiscal.
  </p>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

    void printHtml(html, 'Informe');
  },

  exportDetailedReport(vehicle: Vehicle, expenses: Expense[], records: MaintenanceRecord[]): void {
    const generatedAt = new Date().toLocaleString('es-ES');
    const now = new Date();

    // Unified spend stream: expenses + maintenance costs.
    type Entry = { date: string; category: string; amount: number };
    const entries: Entry[] = [
      ...expenses.map((e) => ({ date: e.date, category: e.category, amount: e.amount })),
      ...records
        .filter((r) => r.cost != null && r.cost > 0)
        .map((r) => ({ date: r.date, category: 'Mantenimiento', amount: r.cost as number })),
    ];

    const grandTotal = entries.reduce((s, e) => s + e.amount, 0);

    // ── Last 12 months series ──────────────────────────────────────────────
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('es-ES', { month: 'short' }),
        total: 0,
      });
    }
    entries.forEach((e) => {
      const d = new Date(e.date);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.total += e.amount;
    });
    const maxMonth = Math.max(1, ...months.map((m) => m.total));
    const last12Total = months.reduce((s, m) => s + m.total, 0);
    const monthlyAvg = last12Total / 12;

    // ── Category breakdown ─────────────────────────────────────────────────
    const cats: Record<string, number> = {};
    entries.forEach((e) => {
      cats[e.category] = (cats[e.category] ?? 0) + e.amount;
    });
    const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const maxCat = Math.max(1, ...catRows.map(([, v]) => v));

    // ── Current-year total ────────────────────────────────────────────────
    const yearTotal = entries
      .filter((e) => new Date(e.date).getFullYear() === now.getFullYear())
      .reduce((s, e) => s + e.amount, 0);

    const costPerKm = vehicle.current_km > 0 ? grandTotal / vehicle.current_km : 0;

    const monthBars = months
      .map(
        (m) => `
      <div class="bar-col">
        <div class="bar-track">
          <div class="bar-fill" style="height: ${Math.round((m.total / maxMonth) * 100)}%"></div>
        </div>
        <div class="bar-val">${m.total > 0 ? esc(fmtEur(m.total)) : '—'}</div>
        <div class="bar-label">${esc(m.label)}</div>
      </div>`,
      )
      .join('');

    const catList = catRows.length
      ? catRows
          .map(
            ([name, value]) => `
        <div class="cat-row">
          <div class="cat-head">
            <span class="cat-name">${esc(name)}</span>
            <span class="cat-amt">${esc(fmtEur(value))} · ${grandTotal > 0 ? Math.round((value / grandTotal) * 100) : 0}%</span>
          </div>
          <div class="cat-track"><div class="cat-fill" style="width: ${Math.round((value / maxCat) * 100)}%"></div></div>
        </div>`,
          )
          .join('')
      : '<p class="empty">Sin gastos registrados</p>';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe detallado · ${esc(vehicle.brand)} ${esc(vehicle.model)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1d1d1f; padding: 48px; line-height: 1.5; }
  .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #707070; }
  h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.6px; margin: 6px 0 2px; }
  h2 { font-size: 16px; font-weight: 600; margin: 36px 0 14px; }
  .meta { font-size: 13px; color: #707070; }
  .kpis { display: flex; gap: 28px; margin-top: 24px; padding: 20px 0; border-top: 1px solid #e8e8ed; border-bottom: 1px solid #e8e8ed; flex-wrap: wrap; }
  .kpi .label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #707070; }
  .kpi .value { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-top: 4px; }
  .chart { display: flex; gap: 6px; align-items: flex-end; height: 200px; margin-top: 8px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
  .bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .bar-fill { width: 100%; background: #1d1d1f; border-radius: 4px 4px 0 0; min-height: 2px; }
  .bar-val { font-size: 8px; color: #707070; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .bar-label { font-size: 9px; color: #a1a1a6; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
  .cat-row { margin-bottom: 14px; }
  .cat-head { display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 5px; }
  .cat-name { font-weight: 500; }
  .cat-amt { color: #707070; font-variant-numeric: tabular-nums; }
  .cat-track { height: 8px; background: #f0f0f2; border-radius: 999px; overflow: hidden; }
  .cat-fill { height: 100%; background: #1d1d1f; border-radius: 999px; }
  .empty { color: #a1a1a6; text-align: center; padding: 16px; font-size: 12.5px; }
  .footer { margin-top: 40px; font-size: 11px; color: #a1a1a6; }
  @media print { body { padding: 24px; } @page { margin: 16mm; } }
</style>
</head>
<body>
  <span class="eyebrow">Informe detallado · FocusHub</span>
  <h1>${esc(vehicle.brand)} ${esc(vehicle.model)}</h1>
  <p class="meta">
    ${esc(vehicle.year)}${vehicle.license_plate ? ` · ${esc(vehicle.license_plate)}` : ''} · ${esc(fmtKm(vehicle.current_km))}
  </p>

  <div class="kpis">
    <div class="kpi"><div class="label">Gasto total</div><div class="value">${esc(fmtEur(grandTotal))}</div></div>
    <div class="kpi"><div class="label">Año en curso</div><div class="value">${esc(fmtEur(yearTotal))}</div></div>
    <div class="kpi"><div class="label">Media mensual</div><div class="value">${esc(fmtEur(monthlyAvg))}</div></div>
    <div class="kpi"><div class="label">Proyección anual</div><div class="value">${esc(fmtEur(monthlyAvg * 12))}</div></div>
    <div class="kpi"><div class="label">Coste por km</div><div class="value">${esc(fmtEur(costPerKm))}</div></div>
  </div>

  <h2>Gasto mensual · últimos 12 meses</h2>
  <div class="chart">${monthBars}</div>

  <h2>Desglose por categoría</h2>
  ${catList}

  <p class="footer">Generado el ${esc(generatedAt)} · FocusHub. Incluye gastos y costes de mantenimiento.</p>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

    void printHtml(html, 'Informe');
  },
  exportOBD2Report(vehicle: Vehicle, readings: OBD2Reading[], anomalies: OBD2Anomaly[]): void {
    const generatedAt = new Date().toLocaleString('es-ES');

    // ── Period covered ────────────────────────────────────────────────────────
    const withDate = readings.filter((r) => r.created_at);
    const periodStart = withDate.length
      ? new Date(withDate[withDate.length - 1].created_at!).toLocaleString('es-ES')
      : '—';
    const periodEnd = withDate.length
      ? new Date(withDate[0].created_at!).toLocaleString('es-ES')
      : '—';

    // ── Aggregated stats ──────────────────────────────────────────────────────
    const avg = (key: keyof OBD2Reading) => {
      const vals = readings
        .map((r) => r[key] as number | null)
        .filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };
    const max = (key: keyof OBD2Reading) => {
      const vals = readings
        .map((r) => r[key] as number | null)
        .filter((v): v is number => v !== null);
      return vals.length ? Math.max(...vals) : null;
    };

    const fmt = (v: number | null, dec = 1) => (v !== null ? v.toFixed(dec) : '—');

    const criticalCount = anomalies.filter((a) => a.severity === 'critical' && !a.dismissed).length;
    const warnCount = anomalies.filter((a) => a.severity === 'warn' && !a.dismissed).length;
    const dismissedCount = anomalies.filter((a) => a.dismissed).length;

    // ── Recommendations based on anomaly patterns ──────────────────────────
    const anomalyTypes = new Set(anomalies.filter((a) => !a.dismissed).map((a) => a.type));
    const recommendations: string[] = [];
    if (anomalyTypes.has('overtemp'))
      recommendations.push('Sistema de refrigeración: revisar nivel de refrigerante y termostato.');
    if (anomalyTypes.has('low_battery'))
      recommendations.push('Batería: comprobar voltaje en reposo y estado del alternador.');
    if (anomalyTypes.has('oil_pressure_low'))
      recommendations.push('Presión de aceite baja: verificar nivel de aceite y bomba.');
    if (anomalyTypes.has('engine_load_high'))
      recommendations.push('Carga de motor alta sostenida: revisar filtro de aire y EGR.');
    if (anomalyTypes.has('high_rpms'))
      recommendations.push('RPM elevadas frecuentes: puede acelerar desgaste del motor y aceite.');
    if (anomalyTypes.has('low_fuel'))
      recommendations.push(
        'Combustible bajo recurrente: evitar conducir con menos del 10% para proteger la bomba.',
      );
    if (recommendations.length === 0)
      recommendations.push(
        'Sin anomalías activas. El vehículo muestra parámetros dentro del rango normal.',
      );

    // ── Anomaly rows ─────────────────────────────────────────────────────────
    const anomalyRows = anomalies.length
      ? [...anomalies]
          .sort(
            (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
          )
          .map((a) => {
            const severityColor = a.severity === 'critical' ? '#b64400' : '#c77700';
            const severityLabel = a.severity === 'critical' ? 'Crítico' : 'Advertencia';
            return `
        <tr style="opacity: ${a.dismissed ? 0.5 : 1}">
          <td>${a.created_at ? new Date(a.created_at).toLocaleString('es-ES') : '—'}</td>
          <td><span style="color: ${severityColor}; font-weight: 600">${esc(severityLabel)}</span></td>
          <td>${esc(a.message)}</td>
          <td class="num">${a.value}</td>
          <td class="num">${a.threshold}</td>
          <td>${a.dismissed ? 'Revisado' : 'Activo'}</td>
        </tr>`;
          })
          .join('')
      : '<tr><td colspan="6" class="empty">Sin anomalías registradas</td></tr>';

    // ── Sample readings (last 20) ─────────────────────────────────────────
    const sample = readings.slice(0, 20);
    const readingRows = sample.length
      ? sample
          .map(
            (r) => `
        <tr>
          <td>${r.created_at ? new Date(r.created_at).toLocaleString('es-ES') : '—'}</td>
          <td class="num">${r.rpm ?? '—'}</td>
          <td class="num">${r.speed ?? '—'}</td>
          <td class="num">${r.coolant_temp ?? '—'}</td>
          <td class="num">${r.engine_load ?? '—'}</td>
          <td class="num">${r.battery_voltage ?? '—'}</td>
          <td class="num">${r.oil_pressure ?? '—'}</td>
          <td class="num">${r.fuel_level ?? '—'}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="8" class="empty">Sin lecturas registradas</td></tr>';

    const recList = recommendations.map((r) => `<li>${esc(r)}</li>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe OBD-II · ${esc(vehicle.brand)} ${esc(vehicle.model)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1d1d1f; padding: 48px; line-height: 1.5; }
  .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #707070; }
  h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.6px; margin: 6px 0 2px; }
  h2 { font-size: 16px; font-weight: 600; margin: 36px 0 12px; }
  h3 { font-size: 13px; font-weight: 600; margin: 0 0 8px; color: #3a3a3c; }
  .meta { font-size: 13px; color: #707070; }
  .kpis { display: flex; gap: 24px; margin-top: 24px; padding: 20px 0; border-top: 1px solid #e8e8ed; border-bottom: 1px solid #e8e8ed; flex-wrap: wrap; }
  .kpi .label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #707070; }
  .kpi .value { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-top: 4px; }
  .kpi .value.warn { color: #c77700; }
  .kpi .value.critical { color: #b64400; }
  .kpi .value.ok { color: #1a9e3f; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
  .stat { background: #f5f5f7; border-radius: 10px; padding: 12px 14px; }
  .stat .slabel { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #707070; }
  .stat .svalue { font-size: 18px; font-weight: 700; margin-top: 2px; }
  .stat .sunit { font-size: 10px; color: #707070; }
  .recs { background: #f0f8f0; border-radius: 12px; padding: 16px 20px; }
  .recs ul { padding-left: 18px; }
  .recs li { font-size: 13px; line-height: 1.6; color: #1d1d1f; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { text-align: left; font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #707070; padding: 8px 10px; border-bottom: 1.5px solid #1d1d1f; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8e8ed; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: #a1a1a6; text-align: center; padding: 16px; }
  .period { font-size: 12px; color: #707070; margin-bottom: 16px; }
  .footer { margin-top: 40px; font-size: 11px; color: #a1a1a6; border-top: 1px solid #e8e8ed; padding-top: 16px; }
  @media print { body { padding: 24px; } @page { margin: 16mm; } }
</style>
</head>
<body>
  <span class="eyebrow">Informe de diagnóstico OBD-II · FocusHub</span>
  <h1>${esc(vehicle.brand)} ${esc(vehicle.model)}</h1>
  <p class="meta">
    ${esc(vehicle.year)}${vehicle.license_plate ? ` · ${esc(vehicle.license_plate)}` : ''}${vehicle.vin ? ` · VIN ${esc(vehicle.vin)}` : ''}
  </p>

  <div class="kpis">
    <div class="kpi">
      <div class="label">Lecturas</div>
      <div class="value">${readings.length}</div>
    </div>
    <div class="kpi">
      <div class="label">Alertas críticas</div>
      <div class="value ${criticalCount > 0 ? 'critical' : 'ok'}">${criticalCount}</div>
    </div>
    <div class="kpi">
      <div class="label">Advertencias</div>
      <div class="value ${warnCount > 0 ? 'warn' : 'ok'}">${warnCount}</div>
    </div>
    <div class="kpi">
      <div class="label">Revisadas</div>
      <div class="value">${dismissedCount}</div>
    </div>
    <div class="kpi">
      <div class="label">Km actuales</div>
      <div class="value">${FMT_KM.format(vehicle.current_km)}</div>
    </div>
  </div>

  <h2>Estadísticas de conducción</h2>
  <p class="period">Período: ${esc(periodStart)} → ${esc(periodEnd)}</p>
  <div class="stats-grid">
    <div class="stat">
      <div class="slabel">RPM media</div>
      <div class="svalue">${fmt(avg('rpm'), 0)}</div>
      <div class="sunit">rev/min</div>
    </div>
    <div class="stat">
      <div class="slabel">RPM máx.</div>
      <div class="svalue">${fmt(max('rpm'), 0)}</div>
      <div class="sunit">rev/min</div>
    </div>
    <div class="stat">
      <div class="slabel">Temp. media</div>
      <div class="svalue">${fmt(avg('coolant_temp'))}</div>
      <div class="sunit">°C</div>
    </div>
    <div class="stat">
      <div class="slabel">Temp. máx.</div>
      <div class="svalue">${fmt(max('coolant_temp'))}</div>
      <div class="sunit">°C</div>
    </div>
    <div class="stat">
      <div class="slabel">Carga media</div>
      <div class="svalue">${fmt(avg('engine_load'))}</div>
      <div class="sunit">%</div>
    </div>
    <div class="stat">
      <div class="slabel">Batería media</div>
      <div class="svalue">${fmt(avg('battery_voltage'))}</div>
      <div class="sunit">V</div>
    </div>
    <div class="stat">
      <div class="slabel">Vel. media</div>
      <div class="svalue">${fmt(avg('speed'), 0)}</div>
      <div class="sunit">km/h</div>
    </div>
    <div class="stat">
      <div class="slabel">Vel. máx.</div>
      <div class="svalue">${fmt(max('speed'), 0)}</div>
      <div class="sunit">km/h</div>
    </div>
  </div>

  <h2>Recomendaciones</h2>
  <div class="recs">
    <ul>${recList}</ul>
  </div>

  <h2>Registro de anomalías</h2>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Severidad</th><th>Descripción</th><th class="num">Valor</th><th class="num">Umbral</th><th>Estado</th>
    </tr></thead>
    <tbody>${anomalyRows}</tbody>
  </table>

  <h2>Últimas lecturas (muestra)</h2>
  <table>
    <thead><tr>
      <th>Fecha</th>
      <th class="num">RPM</th>
      <th class="num">Vel.</th>
      <th class="num">Temp.</th>
      <th class="num">Carga%</th>
      <th class="num">Bat.V</th>
      <th class="num">Aceite</th>
      <th class="num">Comb.%</th>
    </tr></thead>
    <tbody>${readingRows}</tbody>
  </table>

  <p class="footer">
    Generado el ${esc(generatedAt)} · FocusHub.<br>
    Informe orientativo basado en datos del adaptador OBD-II. No sustituye el diagnóstico de un técnico certificado.
  </p>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

    void printHtml(html, 'Informe OBD-II');
  },
};
