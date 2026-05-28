-- Un viaje sorpresa debe ser accesible por share_token aunque visibility = 'private'.
-- El creador no debería tener que activar dos toggles (Privacidad + Sorpresa).
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
