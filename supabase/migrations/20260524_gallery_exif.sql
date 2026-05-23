-- ─── Galería: EXIF + GPS + dimensiones ──────────────────────────────────
-- Añade columnas para coordenadas y metadatos extraídos del EXIF en cliente.
-- Idempotente: no toca filas existentes.

alter table public.galeria_imagenes
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision,
  add column if not exists taken_at  timestamptz,
  add column if not exists width     integer,
  add column if not exists height    integer;

create index if not exists galeria_imagenes_geo_idx
  on public.galeria_imagenes (latitude, longitude)
  where latitude is not null and longitude is not null;
