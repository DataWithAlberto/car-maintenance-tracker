-- =============================================================================
-- FOCUSHUB · Setup completo de base de datos
-- =============================================================================
-- Instrucciones:
--   1. Ve a supabase.com → tu proyecto → SQL Editor → New query
--   2. Copia TODO este archivo y pégalo
--   3. Pulsa RUN
-- =============================================================================


-- ─── TABLAS PRINCIPALES ───────────────────────────────────────────────────────

-- USERS (espejo de auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  license_plate VARCHAR(20),
  color VARCHAR(50),
  fuel_type VARCHAR(50),
  transmission VARCHAR(50),
  current_km INTEGER NOT NULL,
  vin VARCHAR(50),
  model_3d_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);

-- MAINTENANCE_RECORDS
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  km_at_service INTEGER NOT NULL,
  cost DECIMAL(10, 2),
  description TEXT,
  parts_location TEXT,
  next_service_km INTEGER,
  next_service_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);

-- MAINTENANCE_ATTACHMENTS
CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_record_id UUID NOT NULL REFERENCES maintenance_records(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON expenses(vehicle_id);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  doc_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  expiry_date DATE,
  is_important BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON documents(vehicle_id);

-- SHARED_ACCESS
CREATE TABLE IF NOT EXISTS shared_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vehicle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_user ON shared_access(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_vehicle ON shared_access(vehicle_id);

-- ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high')),
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TRIPS
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
  fuel_consumed         FLOAT,
  avg_speed             FLOAT,
  max_altitude          FLOAT,
  driving_time_minutes  INTEGER,
  notes                 TEXT,
  weather_condition     TEXT,
  weather_temp          FLOAT,
  weather_humidity      INTEGER,
  weather_wind_speed    FLOAT,
  spotify_playlist_url  TEXT,
  share_token           TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id     ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_by     ON trips(created_by);
CREATE INDEX IF NOT EXISTS idx_trips_start_datetime ON trips(start_datetime DESC);

-- TRIP_WAYPOINTS
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

CREATE INDEX IF NOT EXISTS idx_waypoints_trip_id ON trip_waypoints(trip_id, order_index);

-- INSURANCE_POLICIES
CREATE TABLE IF NOT EXISTS insurance_policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES users(id),
  provider          VARCHAR(150) NOT NULL,
  policy_number     VARCHAR(100),
  coverage_type     VARCHAR(50) NOT NULL CHECK (coverage_type IN ('terceros', 'terceros_ampliado', 'todo_riesgo', 'todo_riesgo_franquicia')),
  premium_amount    DECIMAL(10, 2),
  payment_frequency VARCHAR(20) CHECK (payment_frequency IN ('mensual', 'trimestral', 'semestral', 'anual')),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  deductible        DECIMAL(10, 2),
  contact_phone     VARCHAR(30),
  document_url      TEXT,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_vehicle  ON insurance_policies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_insurance_end_date ON insurance_policies(end_date);


-- ─── TRIGGER: sincronizar auth.users → public.users ──────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- IMPORTANTE: sincronizar usuarios que ya existían antes de crear las tablas
INSERT INTO public.users (id, email, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', '') AS full_name
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ─── TRIGGER: updated_at automático ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_updated_at ON trips;
CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS insurance_updated_at ON insurance_policies;
CREATE TRIGGER insurance_updated_at
  BEFORE UPDATE ON insurance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_access       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_waypoints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies  ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS "users_select"      ON users;
CREATE POLICY "users_select"      ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_update_self" ON users;
CREATE POLICY "users_update_self" ON users FOR UPDATE USING (auth.uid() = id);

-- Vehicles
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_access
      WHERE shared_access.vehicle_id = vehicles.id
      AND shared_access.user_id = auth.uid()
      AND shared_access.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_access
      WHERE shared_access.vehicle_id = vehicles.id
      AND shared_access.user_id = auth.uid()
      AND shared_access.status = 'accepted'
      AND shared_access.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
  USING (owner_id = auth.uid());

-- Maintenance records
DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;
CREATE POLICY "maintenance_select" ON maintenance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id
      AND (
        vehicles.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted')
      )
    )
  );

DROP POLICY IF EXISTS "maintenance_write" ON maintenance_records;
CREATE POLICY "maintenance_write" ON maintenance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id
      AND (
        vehicles.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id
      AND (
        vehicles.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor')
      )
    )
  );

-- Expenses
DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = expenses.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted'))
    )
  );

DROP POLICY IF EXISTS "expenses_write" ON expenses;
CREATE POLICY "expenses_write" ON expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = expenses.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = expenses.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor'))
    )
  );

-- Documents
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = documents.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted'))
    )
  );

DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_write" ON documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = documents.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = documents.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor'))
    )
  );

-- Shared access
DROP POLICY IF EXISTS "shared_select" ON shared_access;
CREATE POLICY "shared_select" ON shared_access FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = shared_access.vehicle_id AND vehicles.owner_id = auth.uid()));

DROP POLICY IF EXISTS "shared_insert" ON shared_access;
CREATE POLICY "shared_insert" ON shared_access FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = shared_access.vehicle_id AND vehicles.owner_id = auth.uid()));

DROP POLICY IF EXISTS "shared_update" ON shared_access;
CREATE POLICY "shared_update" ON shared_access FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = shared_access.vehicle_id AND vehicles.owner_id = auth.uid()));

DROP POLICY IF EXISTS "shared_delete" ON shared_access;
CREATE POLICY "shared_delete" ON shared_access FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = shared_access.vehicle_id AND vehicles.owner_id = auth.uid()));

-- Trips
DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT
  USING (
    created_by = auth.uid()
    OR vehicle_id IN (SELECT vehicle_id FROM shared_access WHERE user_id = auth.uid() AND status = 'accepted')
  );

DROP POLICY IF EXISTS "trips_insert" ON trips;
CREATE POLICY "trips_insert" ON trips FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND vehicle_id IN (
      SELECT id FROM vehicles WHERE owner_id = auth.uid()
      UNION
      SELECT vehicle_id FROM shared_access WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "trips_update" ON trips;
CREATE POLICY "trips_update" ON trips FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "trips_delete" ON trips;
CREATE POLICY "trips_delete" ON trips FOR DELETE USING (created_by = auth.uid());

-- Trip waypoints
DROP POLICY IF EXISTS "waypoints_select" ON trip_waypoints;
CREATE POLICY "waypoints_select" ON trip_waypoints FOR SELECT
  USING (trip_id IN (SELECT id FROM trips));

DROP POLICY IF EXISTS "waypoints_insert" ON trip_waypoints;
CREATE POLICY "waypoints_insert" ON trip_waypoints FOR INSERT
  WITH CHECK (trip_id IN (SELECT id FROM trips WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "waypoints_delete" ON trip_waypoints;
CREATE POLICY "waypoints_delete" ON trip_waypoints FOR DELETE
  USING (trip_id IN (SELECT id FROM trips WHERE created_by = auth.uid()));

-- Insurance
DROP POLICY IF EXISTS "insurance_select" ON insurance_policies;
CREATE POLICY "insurance_select" ON insurance_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = insurance_policies.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted'))
    )
  );

DROP POLICY IF EXISTS "insurance_write" ON insurance_policies;
CREATE POLICY "insurance_write" ON insurance_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = insurance_policies.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = insurance_policies.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM shared_access WHERE shared_access.vehicle_id = vehicles.id AND shared_access.user_id = auth.uid() AND shared_access.status = 'accepted' AND shared_access.role = 'editor'))
    )
  );


-- =============================================================================
-- ¡Listo! Si no hay errores en rojo, la base de datos está configurada.
-- =============================================================================
