-- Añade una columna opcional `nota` a prestamo_movimientos para que cada pago
-- pueda llevar un texto libre asociado (ej. "cuota + intereses", "pago doble").
-- El campo es nullable y por defecto NULL; la sincronización con Google Sheets
-- la ignora y se preserva localmente entre syncs.

ALTER TABLE prestamo_movimientos
  ADD COLUMN IF NOT EXISTS nota TEXT NULL;
