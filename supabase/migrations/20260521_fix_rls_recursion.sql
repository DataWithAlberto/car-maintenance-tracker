-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: "infinite recursion detected in policy for relation vehicles" (42P17)
--
-- Causa: la política RLS de `vehicles` consultaba `shared_access`, y la de
-- `shared_access` consultaba `vehicles` de vuelta → recursión infinita.
--
-- Solución: mover las comprobaciones de acceso a funciones SECURITY DEFINER.
-- Al ejecutarse como el propietario de la función, sus consultas internas
-- NO vuelven a disparar las políticas RLS, lo que rompe el bucle.
--
-- Cómo aplicar: Supabase → SQL Editor → pega todo esto → Run.
-- Es idempotente: se puede ejecutar varias veces sin problema.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Funciones helper (SECURITY DEFINER) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_vehicle_owner(vid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vehicles WHERE id = vid AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.can_read_vehicle(vid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vehicles WHERE id = vid AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM shared_access
                 WHERE vehicle_id = vid AND user_id = auth.uid() AND status = 'accepted');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_vehicle(vid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vehicles WHERE id = vid AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM shared_access
                 WHERE vehicle_id = vid AND user_id = auth.uid() AND status = 'accepted'
                   AND role IN ('owner','editor'));
$$;

-- ─── Vehicles ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  USING (public.can_read_vehicle(id));

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  USING (public.can_edit_vehicle(id));

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
  USING (owner_id = auth.uid());

-- ─── Maintenance records ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;
CREATE POLICY "maintenance_select" ON maintenance_records FOR SELECT
  USING (public.can_read_vehicle(vehicle_id));

DROP POLICY IF EXISTS "maintenance_write" ON maintenance_records;
CREATE POLICY "maintenance_write" ON maintenance_records FOR ALL
  USING (public.can_edit_vehicle(vehicle_id))
  WITH CHECK (public.can_edit_vehicle(vehicle_id));

-- ─── Expenses ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT
  USING (public.can_read_vehicle(vehicle_id));

DROP POLICY IF EXISTS "expenses_write" ON expenses;
CREATE POLICY "expenses_write" ON expenses FOR ALL
  USING (public.can_edit_vehicle(vehicle_id))
  WITH CHECK (public.can_edit_vehicle(vehicle_id));

-- ─── Documents ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (public.can_read_vehicle(vehicle_id));

DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_write" ON documents FOR ALL
  USING (public.can_edit_vehicle(vehicle_id))
  WITH CHECK (public.can_edit_vehicle(vehicle_id));

-- ─── Shared access ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shared_select" ON shared_access;
CREATE POLICY "shared_select" ON shared_access FOR SELECT
  USING (user_id = auth.uid() OR public.is_vehicle_owner(vehicle_id));

DROP POLICY IF EXISTS "shared_insert" ON shared_access;
CREATE POLICY "shared_insert" ON shared_access FOR INSERT
  WITH CHECK (public.is_vehicle_owner(vehicle_id));

DROP POLICY IF EXISTS "shared_update" ON shared_access;
CREATE POLICY "shared_update" ON shared_access FOR UPDATE
  USING (user_id = auth.uid() OR public.is_vehicle_owner(vehicle_id));

DROP POLICY IF EXISTS "shared_delete" ON shared_access;
CREATE POLICY "shared_delete" ON shared_access FOR DELETE
  USING (user_id = auth.uid() OR public.is_vehicle_owner(vehicle_id));

-- ─── Insurance ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "insurance_select" ON insurance_policies;
CREATE POLICY "insurance_select" ON insurance_policies FOR SELECT
  USING (public.can_read_vehicle(vehicle_id));

DROP POLICY IF EXISTS "insurance_write" ON insurance_policies;
CREATE POLICY "insurance_write" ON insurance_policies FOR ALL
  USING (public.can_edit_vehicle(vehicle_id))
  WITH CHECK (public.can_edit_vehicle(vehicle_id));
