-- RPC: permite a usuarios anónimos sumar +1 a una reacción emoji en un viaje
-- sorpresa, identificado por su share_token. Las reacciones viven dentro de
-- surprise_config.reactions como JSONB: {"🥹": 3, "😍": 1, ...}.
--
-- Sólo acepta los 4 emojis previstos para evitar inyección arbitraria.

CREATE OR REPLACE FUNCTION public.add_surprise_reaction(
  p_token TEXT,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip      trips%ROWTYPE;
  v_reactions JSONB;
  v_current   INTEGER;
BEGIN
  IF p_emoji NOT IN ('🥹', '😍', '🎉', '😱') THEN
    RAISE EXCEPTION 'Emoji no permitido';
  END IF;

  SELECT * INTO v_trip FROM trips
   WHERE share_token = p_token
     AND is_surprise = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Surprise trip not found';
  END IF;

  v_reactions := COALESCE(v_trip.surprise_config->'reactions', '{}'::jsonb);
  v_current   := COALESCE((v_reactions->>p_emoji)::INTEGER, 0);
  v_reactions := v_reactions || jsonb_build_object(p_emoji, v_current + 1);

  UPDATE trips
     SET surprise_config = jsonb_set(
           COALESCE(surprise_config, '{}'::jsonb),
           '{reactions}',
           v_reactions,
           true
         )
   WHERE id = v_trip.id;

  RETURN v_reactions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_surprise_reaction(TEXT, TEXT) TO anon, authenticated;
