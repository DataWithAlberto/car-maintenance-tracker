-- ─── Trip status + planning fields ───────────────────────────────────────────

CREATE TYPE trip_status AS ENUM ('planning', 'confirmed', 'completed');

ALTER TABLE trips
  ADD COLUMN status            trip_status   NOT NULL DEFAULT 'completed',
  ADD COLUMN estimated_budget  NUMERIC(10,2),
  ADD COLUMN start_date        DATE,
  ADD COLUMN end_date          DATE;

ALTER TABLE trips
  ALTER COLUMN start_datetime DROP NOT NULL,
  ALTER COLUMN start_location DROP NOT NULL,
  ALTER COLUMN end_location   DROP NOT NULL,
  ALTER COLUMN start_km       DROP NOT NULL;

ALTER TABLE trips
  ADD CONSTRAINT trips_budget_chk
    CHECK (estimated_budget IS NULL OR estimated_budget >= 0),
  ADD CONSTRAINT trips_planning_date_chk
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- ─── Wishlist flag en reservas ───────────────────────────────────────────────

ALTER TABLE trip_bookings
  ADD COLUMN is_idea BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_trip_bookings_is_idea ON trip_bookings(trip_id, is_idea);

-- ─── Checklist pre-viaje ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_checklist_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  created_by  UUID REFERENCES auth.users(id) NOT NULL,
  text        TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE trip_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_checklist_select" ON trip_checklist_items FOR SELECT
  USING (trip_id IN (SELECT id FROM trips));

CREATE POLICY "trip_checklist_insert" ON trip_checklist_items FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND trip_id IN (
      SELECT id FROM trips
      WHERE created_by = auth.uid()
         OR vehicle_id IN (
           SELECT vehicle_id FROM shared_access
           WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner','editor')
         )
    )
  );

CREATE POLICY "trip_checklist_update" ON trip_checklist_items FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE created_by = auth.uid()
         OR vehicle_id IN (
           SELECT vehicle_id FROM shared_access
           WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner','editor')
         )
    )
  );

CREATE POLICY "trip_checklist_delete" ON trip_checklist_items FOR DELETE
  USING (created_by = auth.uid());

CREATE TRIGGER trip_checklist_items_updated_at
  BEFORE UPDATE ON trip_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_trip_checklist_trip ON trip_checklist_items(trip_id, order_index);

-- ─── RPC: confirmar viaje y resolver wishlist ────────────────────────────────

CREATE OR REPLACE FUNCTION confirm_trip(p_trip_id UUID, p_keep_ids UUID[])
RETURNS trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result trips;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM trips WHERE id = p_trip_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Trip not found or not owned by user';
  END IF;

  UPDATE trip_bookings
     SET is_idea = false
   WHERE trip_id = p_trip_id AND id = ANY(p_keep_ids);

  UPDATE trip_bookings
     SET is_idea = true
   WHERE trip_id = p_trip_id AND NOT (id = ANY(p_keep_ids));

  UPDATE trips
     SET status = 'confirmed', updated_at = NOW()
   WHERE id = p_trip_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;
