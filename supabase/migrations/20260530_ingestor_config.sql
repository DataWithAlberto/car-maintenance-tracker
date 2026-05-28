-- Tabla de configuración interna para el ingestor serverless.
-- Sustituye el fichero .dropbox_cursor que no es viable en Vercel.
CREATE TABLE IF NOT EXISTS public.ingestor_config (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);

-- Solo el service_role puede leer/escribir (el script usa service_role key).
-- No habilitamos RLS con políticas de usuario: esta tabla es interna del sistema.
ALTER TABLE public.ingestor_config ENABLE ROW LEVEL SECURITY;
