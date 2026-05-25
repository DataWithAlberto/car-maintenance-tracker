-- ─── Trip bookings (Reservas / actividades dentro de un viaje) ───────────────

CREATE TYPE trip_booking_type AS ENUM (
  'lodging',
  'museum',
  'activity',
  'restaurant',
  'transport',
  'ticket',
  'other'
);

CREATE TYPE trip_booking_provider AS ENUM (
  'booking',
  'airbnb',
  'vrbo',
  'hotels',
  'tripadvisor',
  'getyourguide',
  'civitatis',
  'standard'
);

CREATE TABLE IF NOT EXISTS trip_bookings (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id              UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  created_by           UUID REFERENCES auth.users(id) NOT NULL,

  title                TEXT NOT NULL,
  type                 trip_booking_type     NOT NULL DEFAULT 'activity',
  provider             trip_booking_provider NOT NULL DEFAULT 'standard',

  start_datetime       TIMESTAMPTZ NOT NULL,
  end_datetime         TIMESTAMPTZ,

  price                NUMERIC(10, 2),
  currency             CHAR(3) DEFAULT 'EUR',

  booking_url          TEXT,
  confirmation_code    TEXT,
  notes                TEXT,

  metadata             JSONB DEFAULT '{}'::jsonb NOT NULL,

  order_index          INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT trip_bookings_datetime_chk
    CHECK (end_datetime IS NULL OR end_datetime >= start_datetime),
  CONSTRAINT trip_bookings_price_chk
    CHECK (price IS NULL OR price >= 0)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE trip_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_bookings_select" ON trip_bookings FOR SELECT
  USING (trip_id IN (SELECT id FROM trips));

CREATE POLICY "trip_bookings_insert" ON trip_bookings FOR INSERT
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

CREATE POLICY "trip_bookings_update" ON trip_bookings FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "trip_bookings_delete" ON trip_bookings FOR DELETE
  USING (created_by = auth.uid());

-- ─── Trigger + índices ───────────────────────────────────────────────────────

CREATE TRIGGER trip_bookings_updated_at
  BEFORE UPDATE ON trip_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_trip_bookings_trip_id    ON trip_bookings(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_start_dt   ON trip_bookings(start_datetime);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_provider   ON trip_bookings(provider);
