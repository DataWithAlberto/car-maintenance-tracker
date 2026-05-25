-- ─── Rename trip_bookings → trip_activities + flip is_idea → is_candidate ──

ALTER TABLE trip_bookings RENAME TO trip_activities;

ALTER INDEX idx_trip_bookings_trip_id  RENAME TO idx_trip_activities_trip_id;
ALTER INDEX idx_trip_bookings_start_dt RENAME TO idx_trip_activities_start_dt;
ALTER INDEX idx_trip_bookings_provider RENAME TO idx_trip_activities_provider;
ALTER INDEX idx_trip_bookings_is_idea  RENAME TO idx_trip_activities_is_candidate;

ALTER POLICY "trip_bookings_select" ON trip_activities RENAME TO "trip_activities_select";
ALTER POLICY "trip_bookings_insert" ON trip_activities RENAME TO "trip_activities_insert";
ALTER POLICY "trip_bookings_update" ON trip_activities RENAME TO "trip_activities_update";
ALTER POLICY "trip_bookings_delete" ON trip_activities RENAME TO "trip_activities_delete";

ALTER TRIGGER trip_bookings_updated_at ON trip_activities RENAME TO trip_activities_updated_at;

ALTER TABLE trip_activities RENAME COLUMN is_idea TO is_candidate;
ALTER TABLE trip_activities ADD COLUMN is_confirmed BOOLEAN
  GENERATED ALWAYS AS (NOT is_candidate) STORED;

-- Actualizar RPC confirm_trip para usar is_candidate
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

  UPDATE trip_activities
     SET is_candidate = NOT (id = ANY(p_keep_ids))
   WHERE trip_id = p_trip_id;

  UPDATE trips
     SET status = 'confirmed', updated_at = NOW()
   WHERE id = p_trip_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- ─── Visibilidad y sorpresa en trips ─────────────────────────────────────────

CREATE TYPE trip_visibility AS ENUM ('private', 'public_link', 'collaborative');

ALTER TABLE trips
  ADD COLUMN visibility      trip_visibility NOT NULL DEFAULT 'private',
  ADD COLUMN is_surprise     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN surprise_config JSONB;

CREATE INDEX IF NOT EXISTS idx_trips_visibility  ON trips(visibility);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);

-- ─── Colaboradores por viaje ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_collaborators (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  invited_by  UUID REFERENCES auth.users(id) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (trip_id, user_id)
);

ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_collab_select" ON trip_collaborators FOR SELECT
  USING (user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "trip_collab_insert" ON trip_collaborators FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND trip_id IN (SELECT id FROM trips WHERE created_by = auth.uid())
  );

CREATE POLICY "trip_collab_delete" ON trip_collaborators FOR DELETE
  USING (
    trip_id IN (SELECT id FROM trips WHERE created_by = auth.uid())
    OR user_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_trip_collab_user ON trip_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_collab_trip ON trip_collaborators(trip_id);

-- ─── RLS extendida ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT
  USING (
    created_by = auth.uid()
    OR vehicle_id IN (
      SELECT vehicle_id FROM shared_access
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
    OR (visibility = 'collaborative' AND id IN (
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "trips_update" ON trips;
CREATE POLICY "trips_update" ON trips FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (visibility = 'collaborative' AND id IN (
      SELECT trip_id FROM trip_collaborators
      WHERE user_id = auth.uid() AND role = 'editor'
    ))
  );

DROP POLICY IF EXISTS "trip_activities_update" ON trip_activities;
CREATE POLICY "trip_activities_update" ON trip_activities FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE created_by = auth.uid()
         OR (visibility = 'collaborative' AND id IN (
           SELECT trip_id FROM trip_collaborators
           WHERE user_id = auth.uid() AND role = 'editor'
         ))
    )
  );

-- ─── Endpoint público por share_token ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_public_trip(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip       trips%ROWTYPE;
  v_activities JSONB;
  v_now        TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_trip FROM trips
   WHERE share_token = p_token
     AND visibility IN ('public_link', 'collaborative');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or not public';
  END IF;

  IF v_trip.is_surprise
     AND v_trip.surprise_config ? 'reveal_date'
     AND (v_trip.surprise_config->>'reveal_date')::timestamptz > v_now THEN
    RETURN jsonb_build_object(
      'locked',          true,
      'reveal_date',     v_trip.surprise_config->'reveal_date',
      'animation',       COALESCE(v_trip.surprise_config->>'animation', 'gift'),
      'message_preview', LEFT(COALESCE(v_trip.surprise_config->>'message', ''), 40)
    );
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.start_datetime), '[]'::jsonb)
    INTO v_activities
   FROM trip_activities a
   WHERE a.trip_id = v_trip.id AND a.is_candidate = false;

  RETURN jsonb_build_object(
    'locked',     false,
    'trip',       row_to_json(v_trip),
    'activities', v_activities
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_trip(TEXT) TO anon, authenticated;

-- ─── Rotar share_token cuando se vuelve privado ──────────────────────────────

CREATE OR REPLACE FUNCTION trips_rotate_token_on_private()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.visibility = 'private' AND OLD.visibility <> 'private' THEN
    NEW.share_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trips_rotate_token_trigger
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION trips_rotate_token_on_private();
