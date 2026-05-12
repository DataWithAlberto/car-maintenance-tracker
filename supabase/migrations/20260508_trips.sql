-- ─── Trips (Rutas de viaje) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trips (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id            UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  created_by            UUID REFERENCES auth.users(id) NOT NULL,
  title                 TEXT,
  start_location        TEXT NOT NULL,
  end_location          TEXT NOT NULL,
  start_lat             FLOAT,
  start_lng             FLOAT,
  end_lat               FLOAT,
  end_lng               FLOAT,
  start_datetime        TIMESTAMPTZ NOT NULL,
  end_datetime          TIMESTAMPTZ,
  start_km              INTEGER NOT NULL,
  end_km                INTEGER,
  total_km              INTEGER GENERATED ALWAYS AS (
                          CASE WHEN end_km IS NOT NULL THEN end_km - start_km ELSE NULL END
                        ) STORED,
  fuel_consumed         FLOAT,                      -- litros
  avg_speed             FLOAT,                      -- km/h
  max_altitude          FLOAT,                      -- metros
  driving_time_minutes  INTEGER,
  notes                 TEXT,
  weather_condition     TEXT,                       -- 'Clear', 'Rain', 'Clouds', etc.
  weather_temp          FLOAT,                      -- °C
  weather_humidity      INTEGER,                    -- %
  weather_wind_speed    FLOAT,                      -- km/h
  spotify_playlist_url  TEXT,
  share_token           TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── Trip waypoints (Puntos de interés) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_waypoints (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  lat         FLOAT NOT NULL,
  lng         FLOAT NOT NULL,
  name        TEXT,
  description TEXT,
  photo_url   TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── RLS policies ─────────────────────────────────────────────────────────────

ALTER TABLE trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_waypoints ENABLE ROW LEVEL SECURITY;

-- trips: owner + shared users can read
CREATE POLICY "trips_select" ON trips FOR SELECT
  USING (
    created_by = auth.uid()
    OR vehicle_id IN (
      SELECT vehicle_id FROM vehicle_access WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "trips_insert" ON trips FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND vehicle_id IN (
      SELECT id FROM vehicles WHERE owner_id = auth.uid()
      UNION
      SELECT vehicle_id FROM vehicle_access
        WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "trips_update" ON trips FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "trips_delete" ON trips FOR DELETE
  USING (created_by = auth.uid());

-- waypoints: inherit from trip
CREATE POLICY "waypoints_select" ON trip_waypoints FOR SELECT
  USING (trip_id IN (SELECT id FROM trips));

CREATE POLICY "waypoints_insert" ON trip_waypoints FOR INSERT
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE created_by = auth.uid())
  );

CREATE POLICY "waypoints_delete" ON trip_waypoints FOR DELETE
  USING (
    trip_id IN (SELECT id FROM trips WHERE created_by = auth.uid())
  );

-- ─── Updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id    ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_by    ON trips(created_by);
CREATE INDEX IF NOT EXISTS idx_trips_start_datetime ON trips(start_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_waypoints_trip_id   ON trip_waypoints(trip_id, order_index);
