-- ============================================================
-- Tabla de auditoría: descarga_logs
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS descarga_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  accion     text,
  detalle    jsonb,
  usuario    text,
  created_at timestamptz DEFAULT now()
);

-- RLS: mismo patrón que el resto del proyecto
ALTER TABLE descarga_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all descarga_logs" ON descarga_logs FOR ALL USING (true) WITH CHECK (true);
