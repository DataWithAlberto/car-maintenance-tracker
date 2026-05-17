import type { Vehicle, MaintenanceRecord, Expense, Document } from '../types';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

const fmtDate = (d: string): string => new Date(d).toLocaleDateString('es-ES');
const fmtEur = (n: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const fmtKm = (n: number): string => `${new Intl.NumberFormat('es-ES').format(n)} km`;

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
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const expensesSorted = [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const maintRows = recordsSorted.length
      ? recordsSorted.map((r) => `
        <tr>
          <td>${esc(fmtDate(r.date))}</td>
          <td>${esc(r.type)}</td>
          <td class="num">${esc(fmtKm(r.km_at_service))}</td>
          <td class="num">${r.cost != null ? esc(fmtEur(r.cost)) : '—'}</td>
          <td>${esc(r.description ?? '—')}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="empty">Sin registros</td></tr>';

    const expenseRows = expensesSorted.length
      ? expensesSorted.map((e) => `
        <tr>
          <td>${esc(fmtDate(e.date))}</td>
          <td>${esc(e.category)}</td>
          <td class="num">${esc(fmtEur(e.amount))}</td>
          <td>${esc(e.description ?? '—')}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" class="empty">Sin registros</td></tr>';

    const docRows = documents.length
      ? documents.map((d) => `
        <tr>
          <td>${esc(d.doc_type)}</td>
          <td>${esc(d.file_name ?? '—')}</td>
          <td>${d.expiry_date ? esc(fmtDate(d.expiry_date)) : '—'}</td>
        </tr>`).join('')
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

    const win = window.open('', '_blank');
    if (!win) throw new Error('No se pudo abrir la ventana de impresión');
    win.document.write(html);
    win.document.close();
  },
};
