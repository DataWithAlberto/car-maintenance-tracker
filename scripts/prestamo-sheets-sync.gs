/**
 * FocusHub · Préstamo ⇄ Google Sheets sync
 * ─────────────────────────────────────────
 *
 * Despliegue:
 *   1. Crea una hoja de cálculo nueva en Google Sheets.
 *   2. Nombra la primera pestaña `Movimientos`.
 *   3. Fila 1 (cabecera, en este orden exacto):
 *      id | fecha | usuario | importe | descripcion | updated_at | deleted_at
 *   4. Extensiones → Apps Script → pega ESTE archivo entero.
 *   5. Desplegar → Nueva implementación → Tipo: «Aplicación web».
 *      - Ejecutar como: «Yo»
 *      - Tener acceso: «Cualquier usuario» (es seguro: la app valida el secreto)
 *   6. Copia la URL ("https://script.google.com/macros/s/.../exec") y pégala
 *      en /prestamo → ⚙ Configurar sync.
 *   7. Cambia SECRET por una cadena aleatoria y guárdala también en la app.
 *
 * Contrato (last-write-wins por updated_at):
 *   GET  ?secret=…           → { rows: [...] }
 *   POST { secret, rows[] }  → { applied, kept, merged: [...] }
 */

const SHEET_NAME = 'Movimientos';
const SECRET = 'CAMBIA_ESTE_VALOR_POR_UNO_LARGO_Y_ALEATORIO';

const COLS = ['id', 'fecha', 'usuario', 'importe', 'descripcion', 'updated_at', 'deleted_at'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error(`Pestaña "${SHEET_NAME}" no encontrada`);
  return sh;
}

function readAll_() {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, COLS.length).getValues();
  return values.map((row, i) => {
    const obj = { _rowIndex: i + 2 };
    COLS.forEach((c, j) => {
      let v = row[j];
      if (v instanceof Date) v = v.toISOString();
      if (c === 'importe' && typeof v === 'string') v = parseFloat(v.replace(',', '.'));
      obj[c] = v === '' ? null : v;
    });
    return obj;
  });
}

function rowFromObj_(obj) {
  return COLS.map((c) => {
    const v = obj[c];
    if (v == null) return '';
    return v;
  });
}

function jsonOut_(body, status) {
  const out = ContentService.createTextOutput(JSON.stringify(body));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function doGet(e) {
  if ((e.parameter.secret || '') !== SECRET) {
    return jsonOut_({ error: 'unauthorized' }, 401);
  }
  const rows = readAll_().map((r) => {
    delete r._rowIndex;
    return r;
  });
  return jsonOut_({ rows: rows });
}

/**
 * Batch upsert con last-write-wins.
 * Para cada row entrante:
 *  - Si el id no existe en la hoja → se inserta.
 *  - Si existe y la `updated_at` entrante es más reciente → se sobrescribe.
 *  - Si existe pero la hoja es más reciente → se ignora y se devuelve en `kept`
 *    (la app debe sobrescribir su copia con el valor de la hoja).
 * Respuesta: { applied: [ids…], kept: [{ id, sheetRow }] }
 */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ error: 'bad_json' }, 400);
  }
  if ((body.secret || '') !== SECRET) return jsonOut_({ error: 'unauthorized' }, 401);

  const incoming = Array.isArray(body.rows) ? body.rows : [];
  const sh = getSheet_();
  const existing = readAll_();
  const byId = {};
  existing.forEach((r) => { byId[r.id] = r; });

  const applied = [];
  const kept = [];
  const toAppend = [];

  incoming.forEach((row) => {
    if (!row.id) return;
    const cur = byId[row.id];
    if (!cur) {
      toAppend.push(rowFromObj_(row));
      applied.push(row.id);
      return;
    }
    const incTs = Date.parse(row.updated_at || '') || 0;
    const curTs = Date.parse(cur.updated_at || '') || 0;
    if (incTs > curTs) {
      // Overwrite existing row
      sh.getRange(cur._rowIndex, 1, 1, COLS.length).setValues([rowFromObj_(row)]);
      applied.push(row.id);
    } else {
      // Sheet wins — return current to caller so it can update its local copy
      const clean = Object.assign({}, cur);
      delete clean._rowIndex;
      kept.push(clean);
    }
  });

  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, COLS.length).setValues(toAppend);
  }

  // Return the full merged view too — saves a round-trip from the client
  const merged = readAll_().map((r) => { delete r._rowIndex; return r; });
  return jsonOut_({ applied: applied, kept: kept, merged: merged });
}
