import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Trip, TripActivity, TripChecklistItem } from '../types';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const fmtDate = (iso: string | null | undefined) =>
  iso ? format(parseISO(iso), "d 'de' MMMM yyyy · HH:mm", { locale: es }) : '—';

const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

interface Params {
  trip: Trip;
  activities: TripActivity[];
  checklist: TripChecklistItem[];
}

/* Abre una ventana nueva con el itinerario en formato imprimible y dispara
 * el diálogo de impresión (que también permite "Guardar como PDF"). */
export const printItinerary = ({ trip, activities, checklist }: Params): void => {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) return;

  const title = trip.title || trip.end_location || 'Viaje';
  const subtitle = `${trip.start_location ?? ''} → ${trip.end_location ?? ''}`;

  const confirmed = activities.filter((a) => !a.is_candidate);

  const activitiesHtml = confirmed.length
    ? confirmed
        .map(
          (a) => `
      <article class="card">
        <header>
          <span class="kind">${esc(a.activity_type ?? 'actividad')}</span>
          <h3>${esc(a.title ?? 'Sin título')}</h3>
          <p class="date">${fmtDate(a.start_datetime ?? null)}</p>
        </header>
        ${a.location ? `<p class="meta">📍 ${esc(a.location)}</p>` : ''}
        ${a.price != null ? `<p class="meta">💶 ${nf0.format(a.price)} €</p>` : ''}
        ${a.notes ? `<p class="notes">${esc(a.notes)}</p>` : ''}
      </article>`,
        )
        .join('')
    : '<p class="empty">Sin actividades confirmadas.</p>';

  const checklistHtml = checklist.length
    ? `<ul class="checklist">${checklist
        .map(
          (i) =>
            `<li class="${i.done ? 'done' : ''}"><span class="box">${i.done ? '✓' : ''}</span>${esc(i.text)}</li>`,
        )
        .join('')}</ul>`
    : '<p class="empty">Sin preparativos.</p>';

  win.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Itinerario · ${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Inter, system-ui, sans-serif; color: #1d1d1f; margin: 0; padding: 48px; line-height: 1.5; }
  header.cover { border-bottom: 2px solid #1d1d1f; padding-bottom: 24px; margin-bottom: 32px; }
  .kicker { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .22em; color: #FF5A5F; text-transform: uppercase; }
  h1 { font-size: 48px; letter-spacing: -1.6px; line-height: 1; margin: 12px 0 8px; }
  .subtitle { font-size: 18px; color: #707070; font-weight: 300; margin: 0; }
  .dates { font-family: ui-monospace, monospace; font-size: 12px; color: #707070; margin-top: 14px; letter-spacing: .06em; }
  h2 { font-size: 22px; letter-spacing: -.3px; margin: 32px 0 14px; }
  section { margin-bottom: 24px; }
  .card { border: 1px solid #e5e5ea; border-left: 3px solid #FF5A5F; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; page-break-inside: avoid; }
  .card .kind { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: .18em; color: #707070; text-transform: uppercase; }
  .card h3 { font-size: 17px; margin: 4px 0 4px; }
  .card .date { font-family: ui-monospace, monospace; font-size: 12px; color: #707070; margin: 0 0 6px; }
  .card .meta { font-size: 13px; color: #1d1d1f; margin: 2px 0; }
  .card .notes { font-size: 13px; color: #707070; margin-top: 8px; font-style: italic; }
  .checklist { list-style: none; padding: 0; margin: 0; }
  .checklist li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; page-break-inside: avoid; }
  .checklist li.done { color: #a1a1a6; text-decoration: line-through; }
  .checklist .box { display: inline-block; width: 18px; height: 18px; border: 1.5px solid #1d1d1f; border-radius: 4px; text-align: center; line-height: 16px; font-size: 12px; flex-shrink: 0; }
  .empty { color: #a1a1a6; font-size: 14px; font-style: italic; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e5ea; font-size: 11px; color: #a1a1a6; font-family: ui-monospace, monospace; letter-spacing: .08em; }
  @media print {
    body { padding: 24px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <header class="cover">
    <p class="kicker">✦ Itinerario · ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}</p>
    <h1>${esc(title)}</h1>
    <p class="subtitle">${esc(subtitle)}</p>
    ${trip.start_date ? `<p class="dates">${fmtDate(trip.start_date)}${trip.end_date ? ' → ' + fmtDate(trip.end_date) : ''}</p>` : ''}
  </header>

  <section>
    <h2>Actividades reservadas</h2>
    ${activitiesHtml}
  </section>

  <section>
    <h2>Preparativos</h2>
    ${checklistHtml}
  </section>

  <footer>Generado por FocusHub · car-maintenance-tracker</footer>
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`);
  win.document.close();
};
