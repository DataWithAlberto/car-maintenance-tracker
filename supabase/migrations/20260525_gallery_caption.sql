-- ─── Galería: caption editable ─────────────────────────────────────────
-- Pie/leyenda libre por foto. NULL por defecto. Idempotente.

alter table public.galeria_imagenes
  add column if not exists caption text;
