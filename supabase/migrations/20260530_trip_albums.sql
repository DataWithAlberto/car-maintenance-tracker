-- ─── Álbumes de viaje: vincular fotos de galería a trips/actividades ───────
-- Reutiliza la tabla `galeria_imagenes` (bucket `fotos-coche`) — un álbum es
-- "el conjunto de fotos cuyo trip_id apunta a este viaje". No se duplica la
-- foto en una nueva tabla; las fotos sueltas siguen funcionando (trip_id NULL).

ALTER TABLE public.galeria_imagenes
  ADD COLUMN IF NOT EXISTS trip_id     UUID REFERENCES public.trips(id)            ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES public.trip_activities(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS galeria_imagenes_trip_idx
  ON public.galeria_imagenes (trip_id, created_at DESC)
  WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS galeria_imagenes_activity_idx
  ON public.galeria_imagenes (activity_id, created_at DESC)
  WHERE activity_id IS NOT NULL;

-- ─── RLS: una foto vinculada a un trip hereda la visibilidad del trip ─────
-- Mantenemos `gal_select_own` (dueño). Añadimos política adicional para
-- colaboradores y para vehículos compartidos. El acceso público por
-- share_token NO usa RLS — va por la RPC SECURITY DEFINER de abajo.

DROP POLICY IF EXISTS "gal_select_trip_visible" ON public.galeria_imagenes;
CREATE POLICY "gal_select_trip_visible" ON public.galeria_imagenes
  FOR SELECT
  USING (
    trip_id IS NOT NULL AND trip_id IN (
      SELECT id FROM public.trips
       WHERE created_by = auth.uid()
          OR (visibility = 'collaborative' AND id IN (
            SELECT trip_id FROM public.trip_collaborators
             WHERE user_id = auth.uid()
          ))
          OR vehicle_id IN (
            SELECT vehicle_id FROM public.shared_access
             WHERE user_id = auth.uid() AND status = 'accepted'
          )
    )
  );

-- INSERT/UPDATE de fotos vinculadas: solo dueño del viaje o editor colaborativo.
DROP POLICY IF EXISTS "gal_insert_into_trip" ON public.galeria_imagenes;
CREATE POLICY "gal_insert_into_trip" ON public.galeria_imagenes
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      trip_id IS NULL OR trip_id IN (
        SELECT id FROM public.trips
         WHERE created_by = auth.uid()
            OR (visibility = 'collaborative' AND id IN (
              SELECT trip_id FROM public.trip_collaborators
               WHERE user_id = auth.uid() AND role = 'editor'
            ))
      )
    )
  );

-- Sustituimos el insert antiguo (gal_insert_own) por el nuevo que ya cubre fotos sueltas.
DROP POLICY IF EXISTS "gal_insert_own" ON public.galeria_imagenes;

-- ─── RPC pública: viaje + actividades + fotos por share_token ─────────────
-- Reemplaza la versión anterior añadiendo `photos`. El token sigue siendo el
-- único secreto necesario; respeta el modo sorpresa (locked) intacto.

CREATE OR REPLACE FUNCTION public.get_public_trip(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip       trips%ROWTYPE;
  v_activities JSONB;
  v_photos     JSONB;
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

  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id',          g.id,
               'public_url',  g.public_url,
               'caption',     g.caption,
               'taken_at',    g.taken_at,
               'latitude',    g.latitude,
               'longitude',   g.longitude,
               'width',       g.width,
               'height',      g.height,
               'activity_id', g.activity_id,
               'created_at',  g.created_at
             )
             ORDER BY COALESCE(g.taken_at, g.created_at)
           ),
           '[]'::jsonb
         )
    INTO v_photos
   FROM galeria_imagenes g
   WHERE g.trip_id = v_trip.id;

  RETURN jsonb_build_object(
    'locked',     false,
    'trip',       row_to_json(v_trip),
    'activities', v_activities,
    'photos',     v_photos
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_trip(TEXT) TO anon, authenticated;
