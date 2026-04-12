-- ============================================================
-- Migración: Categorías libres de producto
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Tabla de categorías libres (admin puede agregar las que quiera)
CREATE TABLE IF NOT EXISTS categorias (
  id          text PRIMARY KEY,
  nombre      text NOT NULL UNIQUE,
  creado_en   timestamptz DEFAULT now()
);

-- Permisos públicos (mismo patrón que el resto de tablas)
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);

-- 2. Agregar categoria a assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS categoria text;

-- 3. Agregar categoria a records
ALTER TABLE records ADD COLUMN IF NOT EXISTS categoria text;

-- 4. Insertar categorías iniciales de ejemplo
INSERT INTO categorias (id, nombre) VALUES
  ('cat-1', 'Vasos'),
  ('cat-2', 'Servilletas'),
  ('cat-3', 'Unicel'),
  ('cat-4', 'Paveras'),
  ('cat-5', 'General')
ON CONFLICT (nombre) DO NOTHING;
