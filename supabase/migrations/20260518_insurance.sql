-- ─── Insurance policies (Pólizas de seguro) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS insurance_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id),
  provider        VARCHAR(150) NOT NULL,
  policy_number   VARCHAR(100),
  coverage_type   VARCHAR(50) NOT NULL CHECK (coverage_type IN ('terceros', 'terceros_ampliado', 'todo_riesgo', 'todo_riesgo_franquicia')),
  premium_amount  DECIMAL(10, 2),
  payment_frequency VARCHAR(20) CHECK (payment_frequency IN ('mensual', 'trimestral', 'semestral', 'anual')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  deductible      DECIMAL(10, 2),
  contact_phone   VARCHAR(30),
  document_url    TEXT,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_vehicle ON insurance_policies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_insurance_end_date ON insurance_policies(end_date);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

-- Read: vehicle owner or accepted shared user
DROP POLICY IF EXISTS "insurance_select" ON insurance_policies;
CREATE POLICY "insurance_select" ON insurance_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = insurance_policies.vehicle_id
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
DROP POLICY IF EXISTS "insurance_write" ON insurance_policies;
CREATE POLICY "insurance_write" ON insurance_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vehicles WHERE vehicles.id = insurance_policies.vehicle_id
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
      SELECT 1 FROM vehicles WHERE vehicles.id = insurance_policies.vehicle_id
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

-- ─── Updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insurance_updated_at ON insurance_policies;
CREATE TRIGGER insurance_updated_at
  BEFORE UPDATE ON insurance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
