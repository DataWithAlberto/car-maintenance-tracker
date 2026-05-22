import type { Vehicle, MaintenanceRecord, Expense, Document } from '../types';

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

    openPrintWindow(html);
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

    openPrintWindow(html);
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

    openPrintWindow(html);
  },
};

function openPrintWindow(html: string): void {
  const win = window.open('', '_blank');
  if (!win) throw new Error('No se pudo abrir la ventana de impresión');
  win.document.write(html);
  win.document.close();
}
