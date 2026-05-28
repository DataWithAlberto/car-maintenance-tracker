-- Actualizaciones para soportar:
--   1. Pistas progresivas: hints_revealed devuelto según cuántos días faltan
--   2. RPC mark_surprise_opened: registra opened_at la 1ª vez que se abre

-- ─── 1. get_public_trip: incluye hints_revealed según calendario ────────────
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
  v_hints      JSONB;
  v_total_hints INTEGER;
  v_days_until  INTEGER;
  v_to_show     INTEGER;
BEGIN
  SELECT * INTO v_trip FROM trips
   WHERE share_token = p_token
     AND (
       visibility IN ('public_link', 'collaborative')
       OR is_surprise = true
     );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or not public';
  END IF;

  IF v_trip.is_surprise
     AND v_trip.surprise_config ? 'reveal_date'
     AND (v_trip.surprise_config->>'reveal_date')::timestamptz > v_now THEN

    v_hints := COALESCE(v_trip.surprise_config->'hints', '[]'::jsonb);
    v_total_hints := jsonb_array_length(v_hints);

    IF v_total_hints > 0 THEN
      -- Días desde la creación de la sorpresa hasta hoy.
      -- Mostramos 1 pista nueva cada día, sin pasar del total.
      v_days_until := GREATEST(
        1,
        EXTRACT(DAY FROM (v_now - v_trip.created_at))::INTEGER + 1
      );
      v_to_show := LEAST(v_total_hints, v_days_until);
    ELSE
      v_to_show := 0;
    END IF;

    RETURN jsonb_build_object(
      'locked',          true,
      'reveal_date',     v_trip.surprise_config->'reveal_date',
      'animation',       COALESCE(v_trip.surprise_config->>'animation', 'gift'),
      'message_preview', LEFT(COALESCE(v_trip.surprise_config->>'message', ''), 40),
      'cover_url',       v_trip.surprise_config->>'cover_url',
      'hints_revealed',  CASE WHEN v_to_show > 0
                           THEN (SELECT jsonb_agg(value) FROM jsonb_array_elements(v_hints) WITH ORDINALITY t(value, idx) WHERE idx <= v_to_show)
                           ELSE '[]'::jsonb
                         END
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

-- ─── 2. RPC: marca opened_at la 1ª vez (idempotente) ───────────────────────
CREATE OR REPLACE FUNCTION public.mark_surprise_opened(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip  trips%ROWTYPE;
BEGIN
  SELECT * INTO v_trip FROM trips
   WHERE share_token = p_token
     AND is_surprise = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Sólo escribe la 1ª vez, no se sobrescribe
  IF (v_trip.surprise_config->>'opened_at') IS NULL THEN
    UPDATE trips
       SET surprise_config = jsonb_set(
             COALESCE(surprise_config, '{}'::jsonb),
             '{opened_at}',
             to_jsonb(NOW()::text),
             true
           )
     WHERE id = v_trip.id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_surprise_opened(TEXT) TO anon, authenticated;
