/**
 * FocusHub · Préstamo ⇄ Google Sheets sync — versión adaptada a tu Excel.
 * ───────────────────────────────────────────────────────────────────────
 *
 * Layout que respeta el archivo `Prestamo_ford focus.xlsx`:
 *
 *      A          B         C                D    E                       F
 *   1  Fecha      Importe   Quien lo hace
 *   2                                            Importe Inicial          17.000,00 €
 *   3                                            Saldo Pendiente          (calculado)
 *   4
 *   5                                            Pagado por Celia (%)     (calculado)
 *   6                                            Pagado por Alberto (%)   (calculado)
 *   7                                            ← (a partir de aquí
 *   8  …pagos…                                     puedes pegar pagos)
 *
 * Columnas OCULTAS (creadas/mantenidas por el script):
 *      G = id        H = updated_at        I = deleted_at
 *
 * Reglas:
 *   · Una fila se considera «movimiento» si tiene Importe (col B) no vacío.
 *   · Cuando editas A/B/C manualmente, el trigger onEdit bumpea H (updated_at)
 *     y genera G (id) si falta. Esto es lo que permite el last-write-wins.
 *   · F3, F5 y F6 se recalculan en cada lectura/escritura. Tu F2 (Importe
 *     Inicial = 17.000,00 €) NO se toca — es el dato de partida.
 *
 * Despliegue:
 *   1. Sube tu Prestamo_ford focus.xlsx a Google Drive y ábrelo con Google
 *      Sheets (Drive → click derecho → Abrir con → Hojas de cálculo).
 *   2. Extensiones → Apps Script → pega ESTE archivo entero.
 *   3. Cambia SECRET por una cadena aleatoria y guarda.
 *   4. Ejecuta una vez la función `setupSheet` (botón ▶) para ocultar G/H/I.
 *   5. Desplegar → Nueva implementación → «Aplicación web»
 *        - Ejecutar como: Yo
 *        - Tener acceso: Cualquier usuario
 *   6. Copia la URL terminada en `/exec` y pégala en /prestamo de la app
 *      junto al mismo SECRET.
 */

const SHEET_NAME = 'Hoja 1';
const SECRET = 'CAMBIA_ESTE_VALOR_POR_UNO_LARGO_Y_ALEATORIO';
const IMPORTE_INICIAL = 17000;

// Columnas visibles
const COL_FECHA = 1;     // A
const COL_IMPORTE = 2;   // B
const COL_QUIEN = 3;     // C
// Columnas ocultas (sync)
const COL_ID = 7;        // G
const COL_UPDATED = 8;   // H
const COL_DELETED = 9;   // I
const LAST_COL = COL_DELETED;

// Celdas del panel lateral
const CELL_SALDO = 'F3';
const CELL_PCT_CELIA = 'F5';
const CELL_PCT_ALBERTO = 'F6';

// ─── Utilidades ──────────────────────────────────────────────────────────────

function jsonOut_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error(`Pestaña "${SHEET_NAME}" no encontrada`);
  return sh;
}

function toIso_(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function toDate_(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd');
  }
  return String(v).slice(0, 10);
}

function toNum_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
}

// ─── Lectura + autoreparación ────────────────────────────────────────────────

/**
 * Lee todas las filas con Importe no vacío y devuelve movimientos normalizados.
 * Si encuentra filas sin id o sin updated_at, las rellena usando setValues
 * en BATCH (una sola llamada por columna) para no tardar siglos.
 */
function readMovements_() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const numRows = lastRow - 1;
  const rng = sh.getRange(2, 1, numRows, LAST_COL).getValues();
  const now = new Date().toISOString();
  let needsWrite = false;

  for (let i = 0; i < rng.length; i++) {
    const row = rng[i];
    const importe = row[COL_IMPORTE - 1];
    if (importe === '' || importe == null) continue;

    if (!row[COL_ID - 1]) {
      row[COL_ID - 1] = Utilities.getUuid();
      needsWrite = true;
    }
    if (!row[COL_UPDATED - 1]) {
      row[COL_UPDATED - 1] = now;
      needsWrite = true;
    }
  }

  // Un solo setValues por columna en lugar de N setValue individuales:
  // escribe SOLO G (id) y H (updated_at) para no tocar A-F ni fórmulas del panel.
  if (needsWrite) {
    const idCol      = rng.map(function(r) { return [r[COL_ID - 1]]; });
    const updatedCol = rng.map(function(r) { return [r[COL_UPDATED - 1]]; });
    sh.getRange(2, COL_ID,      numRows, 1).setValues(idCol);
    sh.getRange(2, COL_UPDATED, numRows, 1).setValues(updatedCol);
  }

  const out = [];
  for (let i = 0; i < rng.length; i++) {
    const row = rng[i];
    const importe = row[COL_IMPORTE - 1];
    if (importe === '' || importe == null) continue;
    out.push({
      _row: i + 2,
      id: row[COL_ID - 1],
      fecha: toDate_(row[COL_FECHA - 1]),
      importe: toNum_(importe),
      usuario: String(row[COL_QUIEN - 1] || '').trim(),
      updated_at: toIso_(row[COL_UPDATED - 1]),
      deleted_at: toIso_(row[COL_DELETED - 1]),
    });
  }
  return out;
}

function stripRow_(m) {
  const copy = {};
  for (const k in m) if (k !== '_row') copy[k] = m[k];
  return copy;
}

// ─── Recálculo del panel lateral ─────────────────────────────────────────────

function recomputeDashboard_(movements) {
  const sh = getSheet_();
  let celia = 0;
  let alberto = 0;
  for (const m of movements) {
    if (m.deleted_at) continue;
    if (m.usuario === 'Celia') celia += m.importe;
    else if (m.usuario === 'Alberto') alberto += m.importe;
  }
  const saldo = Math.max(0, IMPORTE_INICIAL - celia - alberto);
  sh.getRange(CELL_SALDO).setValue(saldo);
  sh.getRange(CELL_PCT_CELIA).setValue(IMPORTE_INICIAL > 0 ? celia / IMPORTE_INICIAL : 0);
  sh.getRange(CELL_PCT_ALBERTO).setValue(IMPORTE_INICIAL > 0 ? alberto / IMPORTE_INICIAL : 0);
  // Formatea las celdas de % como porcentaje
  sh.getRange(CELL_PCT_CELIA).setNumberFormat('0.0%');
  sh.getRange(CELL_PCT_ALBERTO).setNumberFormat('0.0%');
  sh.getRange(CELL_SALDO).setNumberFormat('#,##0.00 €');
}

// ─── Endpoints HTTP ──────────────────────────────────────────────────────────

function doGet(e) {
  if (!e || (e.parameter.secret || '') !== SECRET) {
    return jsonOut_({ error: 'unauthorized' });
  }
  const movs = readMovements_();
  recomputeDashboard_(movs);
  return jsonOut_({ rows: movs.map(stripRow_) });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOut_({ error: 'bad_json' }); }
  if ((body.secret || '') !== SECRET) return jsonOut_({ error: 'unauthorized' });

  const sh = getSheet_();
  const incoming = Array.isArray(body.rows) ? body.rows : [];
  const current = readMovements_();
  const byId = {};
  current.forEach((m) => { byId[m.id] = m; });

  const applied = [];
  const kept = [];

  for (const row of incoming) {
    if (!row.id) continue;
    const cur = byId[row.id];
    if (!cur) {
      // Fila nueva: 2 setValues en lugar de 6 setValue
      const append = sh.getLastRow() + 1;
      sh.getRange(append, COL_FECHA, 1, 3).setValues([[row.fecha, toNum_(row.importe), row.usuario]]);
      sh.getRange(append, COL_ID,    1, 3).setValues([[row.id, row.updated_at, row.deleted_at || '']]);
      applied.push(row.id);
    } else {
      const incTs = Date.parse(row.updated_at) || 0;
      const curTs = Date.parse(cur.updated_at) || 0;
      if (incTs > curTs) {
        // Actualización: 2 setValues en lugar de 5 setValue
        sh.getRange(cur._row, COL_FECHA,   1, 3).setValues([[row.fecha, toNum_(row.importe), row.usuario]]);
        sh.getRange(cur._row, COL_UPDATED, 1, 2).setValues([[row.updated_at, row.deleted_at || '']]);
        applied.push(row.id);
      } else {
        kept.push(stripRow_(cur));
      }
    }
  }

  const fresh = readMovements_();
  recomputeDashboard_(fresh);
  return jsonOut_({ applied: applied, kept: kept, merged: fresh.map(stripRow_) });
}

// ─── Trigger onEdit: marca updated_at cuando editas A/B/C a mano ────────────

function onEdit(e) {
  try {
    const sh = e.source.getActiveSheet();
    if (sh.getName() !== SHEET_NAME) return;
    const range = e.range;
    if (range.getRow() < 2) return;
    if (range.getColumn() > COL_QUIEN) return;

    const now = new Date().toISOString();
    for (let r = range.getRow(); r < range.getRow() + range.getNumRows(); r++) {
      // Solo bumpea si la fila tiene Importe (es un movimiento real)
      const importe = sh.getRange(r, COL_IMPORTE).getValue();
      if (importe === '' || importe == null) continue;
      sh.getRange(r, COL_UPDATED).setValue(now);
      if (!sh.getRange(r, COL_ID).getValue()) {
        sh.getRange(r, COL_ID).setValue(Utilities.getUuid());
      }
    }
    recomputeDashboard_(readMovements_());
  } catch (err) {
    // onEdit no puede romper la UI del Sheet — silenciamos errores
    console.error('onEdit error', err);
  }
}

// ─── Setup inicial (ejecutar una vez desde el editor de Apps Script) ────────

function setupSheet() {
  const sh = getSheet_();
  sh.getRange(1, COL_ID).setValue('id');
  sh.getRange(1, COL_UPDATED).setValue('updated_at');
  sh.getRange(1, COL_DELETED).setValue('deleted_at');
  sh.hideColumns(COL_ID, 3);
  SpreadsheetApp.getUi().alert('Setup completado ✓\nColumnas G/H/I ocultas.');
}
