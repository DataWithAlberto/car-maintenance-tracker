-- ─── Visibilidad binaria: is_public derivada de visibility ──────────────────
-- Se mantiene la columna `visibility` (enum: private/public_link/collaborative)
-- como única fuente de verdad para preservar el sistema de colaboradores y la
-- RLS existente. `is_public` se expone como columna generada para que el
-- frontend pueda razonar con un boolean y filtrar listados sin reglas mágicas.
-- El Toggle binario del UI mapea:
--   ON  → visibility = 'public_link'   (= is_public TRUE)
--   OFF → visibility = 'private'       (= is_public FALSE)
-- Las filas en estado 'collaborative' siguen contando como públicas (link
-- compartible), pero no son alcanzables desde el toggle binario — se gestionan
-- desde otra superficie (invitar colaborador rota a 'collaborative').

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN
    GENERATED ALWAYS AS (visibility <> 'private') STORED;

CREATE INDEX IF NOT EXISTS idx_trips_is_public ON public.trips(is_public)
  WHERE is_public = TRUE;
