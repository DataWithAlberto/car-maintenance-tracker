-- ─── Fuel logs (Repostajes) + Maintenance comments (Comentarios) ────────────

-- ═══ FUEL_LOGS ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fuel_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id),
  date            DATE NOT NULL,
  km_at_fillup    INTEGER NOT NULL,
  liters          DECIMAL(8, 2) NOT NULL,
  price_per_liter DECIMAL(6, 3) NOT NULL,
  total_cost      DECIMAL(10, 2) GENERATED ALWAYS AS (liters * price_per_liter) STORED,
  station         VARCHAR(200),
  full_tank       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON fuel_logs(vehicle_id, date DESC);

ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

-- Read: vehicle owner or accepted shared user
DROP POLICY IF EXISTS "fuel_logs_select" ON fuel_logs;
CREATE POLICY "fuel_logs_select" ON fuel_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = fuel_logs.vehicle_id
      AND (
        vehicles.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM shared_access
          WHERE shared_access.vehicle_id = vehicles.id
          AND shared_access.user_id = auth.uid()
          AND shared_access.status = 'accepted'
        )
      )
    )
  );

-- Write: vehicle owner or accepted shared editor
DROP POLICY IF EXISTS "fuel_logs_write" ON fuel_logs;
CREATE POLICY "fuel_logs_write" ON fuel_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = fuel_logs.vehicle_id
      AND (
        vehicles.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM shared_access
          WHERE shared_access.vehicle_id = vehicles.id
          AND shared_access.user_id = auth.uid()
          AND shared_access.status = 'accepted'
          AND shared_access.role = 'editor'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = fuel_logs.vehicle_id
      AND (
        vehicles.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM shared_access
          WHERE shared_access.vehicle_id = vehicles.id
          AND shared_access.user_id = auth.uid()
          AND shared_access.status = 'accepted'
          AND shared_access.role = 'editor'
        )
      )
    )
  );

-- ═══ MAINTENANCE_COMMENTS ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS maintenance_comments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_record_id UUID NOT NULL REFERENCES maintenance_records(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  text                  TEXT NOT NULL,
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_record ON maintenance_comments(maintenance_record_id);

ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;

-- Read: anyone with access (owner or accepted shared user) to the parent vehicle
DROP POLICY IF EXISTS "comments_select" ON maintenance_comments;
CREATE POLICY "comments_select" ON maintenance_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_records mr
      JOIN vehicles v ON v.id = mr.vehicle_id
      WHERE mr.id = maintenance_comments.maintenance_record_id
      AND (
        v.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM shared_access sa
          WHERE sa.vehicle_id = v.id
          AND sa.user_id = auth.uid()
          AND sa.status = 'accepted'
        )
      )
    )
  );

-- Insert: owner or accepted shared editor, posting as themselves
DROP POLICY IF EXISTS "comments_insert" ON maintenance_comments;
CREATE POLICY "comments_insert" ON maintenance_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM maintenance_records mr
      JOIN vehicles v ON v.id = mr.vehicle_id
      WHERE mr.id = maintenance_comments.maintenance_record_id
      AND (
        v.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM shared_access sa
          WHERE sa.vehicle_id = v.id
          AND sa.user_id = auth.uid()
          AND sa.status = 'accepted'
          AND sa.role = 'editor'
        )
      )
    )
  );

-- Delete: only the comment author
DROP POLICY IF EXISTS "comments_delete" ON maintenance_comments;
CREATE POLICY "comments_delete" ON maintenance_comments FOR DELETE
  USING (user_id = auth.uid());
