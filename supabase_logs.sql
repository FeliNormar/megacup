-- ============================================================
-- Tabla de auditoría: descarga_logs
-- Ejecutar en: Supabase > SQL Editor
-- Registra cada acción sobre descargas para trazabilidad.
-- ============================================================

CREATE TABLE IF NOT EXISTS descarga_logs (
  id              bigserial PRIMARY KEY,
  descarga_id     text        NOT NULL,
  usuario_nombre  text        NOT NULL,
  accion          text        NOT NULL,  -- 'creada' | 'finalizada' | 'editada' | 'incidencia' | 'eliminada'
  detalle         text        DEFAULT '',
  created_at      timestamptz DEFAULT now()
);

-- Índice para consultas por descarga
CREATE INDEX IF NOT EXISTS idx_descarga_logs_descarga_id
  ON descarga_logs (descarga_id);

-- Índice para consultas por fecha
CREATE INDEX IF NOT EXISTS idx_descarga_logs_created_at
  ON descarga_logs (created_at DESC);

-- RLS: solo lectura/escritura pública (mismo patrón que el resto del proyecto)
ALTER TABLE descarga_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all descarga_logs" ON descarga_logs FOR ALL USING (true) WITH CHECK (true);
