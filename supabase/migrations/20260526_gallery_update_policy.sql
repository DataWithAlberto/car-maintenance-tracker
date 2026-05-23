-- ─── Galería: policy UPDATE faltante ───────────────────────────────────
-- En las migraciones previas se crearon SELECT/INSERT/DELETE para galeria_imagenes
-- pero no UPDATE — sin policy explícita Postgres + RLS deniega cualquier UPDATE.
-- Esto rompía guardar caption y reubicar marcadores en el mapa.

drop policy if exists "gal_update_own" on public.galeria_imagenes;
create policy "gal_update_own" on public.galeria_imagenes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
