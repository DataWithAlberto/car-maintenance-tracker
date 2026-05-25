-- ─── Privacidad real por viaje ────────────────────────────────────────────────
-- Problema anterior: la política trips_select permitía ver TODOS los viajes
-- del vehículo a cualquier usuario con shared_access, ignorando visibility.
-- Resultado: la pareja/familia con acceso compartido veía incluso los viajes
-- marcados como 'private' (p.ej. sorpresas o viajes íntimos).
--
-- Nuevo comportamiento:
--   private       → solo el creador (nadie más, aunque tenga shared_access)
--   public_link   → creador + usuarios con shared_access al vehículo + enlace
--   collaborative → creador + shared_access + colaboradores invitados
--
-- El toggle binario del UI ya mapea correctamente:
--   OFF  → 'private'      → solo para mí
--   ON   → 'public_link'  → visible para quien tenga acceso al vehículo

-- ─── Trips ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT
  USING (
    -- siempre visible para el creador
    created_by = auth.uid()
    -- visible para shared_access SOLO si no es privado
    OR (
      visibility <> 'private'
      AND vehicle_id IN (
        SELECT vehicle_id FROM shared_access
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
    -- visible para colaboradores invitados (modo collaborative)
    OR (
      visibility = 'collaborative'
      AND id IN (
        SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
      )
    )
  );

-- ─── Waypoints ───────────────────────────────────────────────────────────────
-- Heredan visibilidad del viaje padre a través de la subconsulta a trips,
-- que ya aplica RLS. Reescribimos explícitamente para consistencia.
DROP POLICY IF EXISTS "waypoints_select" ON trip_waypoints;
CREATE POLICY "waypoints_select" ON trip_waypoints FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE
        created_by = auth.uid()
        OR (
          visibility <> 'private'
          AND vehicle_id IN (
            SELECT vehicle_id FROM shared_access
            WHERE user_id = auth.uid() AND status = 'accepted'
          )
        )
        OR (
          visibility = 'collaborative'
          AND id IN (
            SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
          )
        )
    )
  );

-- ─── Activities (reservas / actividades) ─────────────────────────────────────
DROP POLICY IF EXISTS "trip_activities_select" ON trip_activities;
CREATE POLICY "trip_activities_select" ON trip_activities FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE
        created_by = auth.uid()
        OR (
          visibility <> 'private'
          AND vehicle_id IN (
            SELECT vehicle_id FROM shared_access
            WHERE user_id = auth.uid() AND status = 'accepted'
          )
        )
        OR (
          visibility = 'collaborative'
          AND id IN (
            SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
          )
        )
    )
  );

-- ─── Checklist ───────────────────────────────────────────────────────────────
-- Si existe la tabla trip_checklist_items, aplicar la misma lógica
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trip_checklist_items'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "checklist_select" ON trip_checklist_items;
      CREATE POLICY "checklist_select" ON trip_checklist_items FOR SELECT
        USING (
          trip_id IN (
            SELECT id FROM trips
            WHERE
              created_by = auth.uid()
              OR (
                visibility <> 'private'
                AND vehicle_id IN (
                  SELECT vehicle_id FROM shared_access
                  WHERE user_id = auth.uid() AND status = 'accepted'
                )
              )
              OR (
                visibility = 'collaborative'
                AND id IN (
                  SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
                )
              )
          )
        );
    $p$;
  END IF;
END $$;
