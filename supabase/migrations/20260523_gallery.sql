-- ─── Galería de fotos del coche ──────────────────────────────────────────
-- Tabla con metadatos de cada imagen subida + RLS por usuario.
-- Las imágenes vivien en el bucket público 'fotos-coche', ruta {user_id}/{uuid-filename}.

create table if not exists public.galeria_imagenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  storage_path text not null,
  public_url text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists galeria_imagenes_user_created_idx
  on public.galeria_imagenes (user_id, created_at desc);

alter table public.galeria_imagenes enable row level security;

drop policy if exists "gal_select_own" on public.galeria_imagenes;
create policy "gal_select_own" on public.galeria_imagenes
  for select using (auth.uid() = user_id);

drop policy if exists "gal_insert_own" on public.galeria_imagenes;
create policy "gal_insert_own" on public.galeria_imagenes
  for insert with check (auth.uid() = user_id);

drop policy if exists "gal_delete_own" on public.galeria_imagenes;
create policy "gal_delete_own" on public.galeria_imagenes
  for delete using (auth.uid() = user_id);

-- ─── Storage bucket policies ─────────────────────────────────────────────
-- Crear el bucket 'fotos-coche' (público) desde el Dashboard de Supabase
-- ANTES de aplicar estas políticas. Lectura abierta, escritura/borrado
-- solo para autenticados dentro de su propia carpeta {auth.uid()}/...

drop policy if exists "fotos_public_read" on storage.objects;
create policy "fotos_public_read" on storage.objects
  for select using (bucket_id = 'fotos-coche');

drop policy if exists "fotos_insert_own" on storage.objects;
create policy "fotos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-coche'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "fotos_delete_own" on storage.objects;
create policy "fotos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-coche'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
