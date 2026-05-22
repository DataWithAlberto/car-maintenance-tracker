-- ─────────────────────────────────────────────────────────────────────────────
-- Endurecimiento de seguridad + índices de rendimiento
--
-- 1. RLS de `users`: la política anterior (USING (true)) permitía a cualquier
--    usuario autenticado leer el email y el nombre de TODOS los usuarios del
--    sistema. Ahora cada usuario solo ve su propia fila y la de las personas
--    con las que comparte algún vehículo.
-- 2. find_user_id_by_email: permite que el flujo de invitación localice a un
--    usuario por email devolviendo SOLO su id, sin exponer el resto de la tabla.
-- 3. Índices compuestos (vehicle_id, fecha) para las consultas de listado
--    ordenadas, que antes ordenaban sin un índice de apoyo.
--
-- Cómo aplicar: Supabase → SQL Editor → pega todo esto → Run.
-- Es idempotente: se puede ejecutar varias veces sin problema.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. RLS de users ─────────────────────────────────────────────────────────

-- ¿auth.uid() comparte algún vehículo con `other_user`, en cualquier sentido?
-- SECURITY DEFINER: sus consultas internas no vuelven a disparar RLS.
CREATE OR REPLACE FUNCTION public.shares_vehicle_with(other_user UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shared_access sa
    JOIN vehicles v ON v.id = sa.vehicle_id
    WHERE (v.owner_id = auth.uid() AND sa.user_id = other_user)
       OR (v.owner_id = other_user AND sa.user_id = auth.uid())
  );
$$;

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT
  USING (id = auth.uid() OR public.shares_vehicle_with(id));

-- ─── 2. Búsqueda de usuario por email para invitaciones ──────────────────────

-- Devuelve SOLO el id (nunca el email ni el nombre de terceros). Reemplaza al
-- SELECT directo sobre `users` que la nueva política ya no permite.
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(lookup_email TEXT)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM users WHERE email = lookup_email LIMIT 1;
$$;

-- ─── 3. Índices compuestos de rendimiento ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_date
  ON maintenance_records(vehicle_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_date
  ON expenses(vehicle_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle_created
  ON documents(vehicle_id, created_at DESC);
