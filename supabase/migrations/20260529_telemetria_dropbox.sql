-- ============================================================
-- FocusHub: Telemetría desde Dropbox (ingesta automática OBDLink)
-- ============================================================
-- viajes_telemetria  →  agrupa los puntos de un viaje (1 CSV = 1 viaje)
-- telemetria_puntos  →  cada fila del CSV (1 Hz aprox.)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Tabla de viajes
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.viajes_telemetria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  fecha           timestamptz NOT NULL,
  dropbox_path    text UNIQUE,          -- ruta en Dropbox; UNIQUE evita doble-ingesta
  distancia_km    numeric(8,2),         -- calculado por trigger o post-proceso
  duracion_seg    integer,              -- calculado por post-proceso
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viajes_tel_vehicle
  ON public.viajes_telemetria(vehicle_id, fecha DESC);

-- ----------------------------------------------------------------
-- 2. Tabla de puntos de telemetría
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetria_puntos (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viaje_id            uuid NOT NULL REFERENCES public.viajes_telemetria(id) ON DELETE CASCADE,

  -- Tiempo
  timestamp_ms        integer NOT NULL,     -- ms desde inicio del viaje (offset)

  -- GPS
  latitude            double precision,
  longitude           double precision,

  -- PIDs principales
  rpm                 integer,
  velocidad           numeric(6,2),         -- km/h
  carga_motor         numeric(5,2),         -- %
  temp_refrigerante   numeric(5,2),         -- °C
  presion_admision    numeric(6,2),         -- kPa
  temp_admision       numeric(5,2),         -- °C
  flujo_maf           numeric(8,3),         -- g/s
  posicion_acelerador numeric(5,2)          -- %
);

-- Índice compuesto para reconstruir la ruta en orden
CREATE INDEX IF NOT EXISTS idx_telemetria_viaje_ts
  ON public.telemetria_puntos(viaje_id, timestamp_ms ASC);

-- Índice espacial ligero (sin PostGIS): útil para filtrar por bbox
CREATE INDEX IF NOT EXISTS idx_telemetria_gps
  ON public.telemetria_puntos(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ----------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------
ALTER TABLE public.viajes_telemetria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetria_puntos  ENABLE ROW LEVEL SECURITY;

-- El propietario del vehículo (y sus accesos compartidos) puede leer
DO $$ BEGIN
  CREATE POLICY "Lectura propia viajes_telemetria"
    ON public.viajes_telemetria FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = viajes_telemetria.vehicle_id
          AND (
            v.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.shared_access sa
              WHERE sa.vehicle_id = v.id
                AND sa.user_id = auth.uid()
                AND sa.status = 'accepted'
            )
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Lectura propia telemetria_puntos"
    ON public.telemetria_puntos FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.viajes_telemetria vt
        JOIN public.vehicles v ON v.id = vt.vehicle_id
        WHERE vt.id = telemetria_puntos.viaje_id
          AND (
            v.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.shared_access sa
              WHERE sa.vehicle_id = v.id
                AND sa.user_id = auth.uid()
                AND sa.status = 'accepted'
            )
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- El script Python usa service_role key → bypassa RLS → no necesita policy INSERT
-- Aun así, si quieres permitir inserts desde el frontend (futuro), descomenta:
-- CREATE POLICY "Insert propio viajes" ON public.viajes_telemetria FOR INSERT
--   WITH CHECK (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_id = auth.uid()));
