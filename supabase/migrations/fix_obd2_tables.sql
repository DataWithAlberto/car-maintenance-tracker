-- Script de reparación: ejecutar si la migración add_obd2_tables.sql falló a medias.
-- Es seguro ejecutar aunque las tablas/índices ya existan.

-- ─── Tablas ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.obd2_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  timestamp bigint NOT NULL,
  rpm integer,
  speed integer,
  coolant_temp numeric(5,2),
  fuel_level numeric(5,2),
  odometer integer,
  oil_pressure numeric(5,2),
  battery_voltage numeric(5,2),
  engine_load numeric(5,2),
  timing_advance numeric(5,2),
  engine_runtime integer,
  maf_air_flow numeric(10,2),
  fuel_trim_bank1 numeric(5,2),
  fuel_rate numeric(10,2),
  short_term_fuel_trim_1 numeric(5,2),
  long_term_fuel_trim_1 numeric(5,2),
  intake_manifold_pressure numeric(5,2),
  absolute_load numeric(5,2),
  relative_throttle_pos numeric(5,2),
  ambient_air_temp numeric(5,2),
  abs_throttle_pos_b numeric(5,2),
  acc_pedal_pos_d numeric(5,2),
  acc_pedal_pos_e numeric(5,2),
  catalyst_temp_bank1_sensor1 numeric(5,2),
  num_emissions_dtc integer,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.obd2_anomalies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  reading_id uuid REFERENCES public.obd2_readings(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warn', 'critical')),
  value numeric(10,2) NOT NULL,
  threshold numeric(10,2) NOT NULL,
  message text NOT NULL,
  dismissed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── Índices (DROP + CREATE para garantizar idempotencia) ─────────────────────

DROP INDEX IF EXISTS public.idx_obd2_readings_vehicle_timestamp;
CREATE INDEX idx_obd2_readings_vehicle_timestamp
  ON public.obd2_readings(vehicle_id, created_at DESC);

DROP INDEX IF EXISTS public.idx_obd2_anomalies_vehicle_created;
CREATE INDEX idx_obd2_anomalies_vehicle_created
  ON public.obd2_anomalies(vehicle_id, created_at DESC);

DROP INDEX IF EXISTS public.idx_obd2_anomalies_type;
CREATE INDEX idx_obd2_anomalies_type
  ON public.obd2_anomalies(vehicle_id, type);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.obd2_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obd2_anomalies ENABLE ROW LEVEL SECURITY;

-- ─── Políticas obd2_readings ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Users can read own vehicle readings"
    ON public.obd2_readings FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = obd2_readings.vehicle_id
          AND (v.owner_id = auth.uid() OR
               EXISTS (
                 SELECT 1 FROM public.shared_access sa
                 WHERE sa.vehicle_id = v.id
                   AND sa.user_id = auth.uid()
                   AND sa.status = 'accepted'
               ))
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Only app service can insert readings"
    ON public.obd2_readings FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = obd2_readings.vehicle_id
          AND v.owner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Políticas obd2_anomalies ─────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Users can read own vehicle anomalies"
    ON public.obd2_anomalies FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = obd2_anomalies.vehicle_id
          AND (v.owner_id = auth.uid() OR
               EXISTS (
                 SELECT 1 FROM public.shared_access sa
                 WHERE sa.vehicle_id = v.id
                   AND sa.user_id = auth.uid()
                   AND sa.status = 'accepted'
               ))
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Only app can insert anomalies"
    ON public.obd2_anomalies FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = obd2_anomalies.vehicle_id
          AND v.owner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own anomalies"
    ON public.obd2_anomalies FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = obd2_anomalies.vehicle_id
          AND v.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = obd2_anomalies.vehicle_id
          AND v.owner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
