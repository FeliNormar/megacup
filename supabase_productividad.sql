-- ============================================================
-- Migración: Sistema de Productividad Normalizada
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Tabla de trailers de cierre del día
-- Registra las cajas del trailer y cómo se distribuyeron entre grupos
create table if not exists trailers_cierre (
  id              text primary key,
  cajas_trailer   integer not null,
  tipo_carga      text not null default 'Ligero',
  grupos_activos  text[] not null default '{}',
  cajas_x_grupo   integer,
  puntos_x_grupo  integer,
  timestamp       bigint,
  creado_en       timestamptz default now()
);

-- Permisos públicos (mismo patrón que el resto de tablas)
alter table trailers_cierre enable row level security;
create policy "allow all trailers_cierre" on trailers_cierre for all using (true) with check (true);

-- ============================================================
-- 2. Columnas de productividad en records (si no existen)
-- Agrega factor_peso y puntos_productividad al historial
-- ============================================================

alter table records
  add column if not exists tipo_carga          text,
  add column if not exists cajas_estimadas     integer,
  add column if not exists cajas_reales        integer,
  add column if not exists cajas_x_descargador integer,
  add column if not exists cajas_x_estibador   integer,
  add column if not exists descargadores       text[] default '{}',
  add column if not exists estibadores         text[] default '{}',
  add column if not exists deleted_at          timestamptz,
  add column if not exists foto_url            text;

-- ============================================================
-- 3. Columnas faltantes en assignments (si no existen)
-- ============================================================

alter table assignments
  add column if not exists tipo_carga      text,
  add column if not exists cajas_estimadas integer,
  add column if not exists descargadores   text[] default '{}',
  add column if not exists estibadores     text[] default '{}',
  add column if not exists deleted_at      timestamptz;

-- ============================================================
-- 4. Índices para consultas de productividad por fecha
-- ============================================================

create index if not exists idx_records_start_time
  on records ("startTime");

create index if not exists idx_trailers_cierre_timestamp
  on trailers_cierre (timestamp);

create index if not exists idx_records_workers
  on records using gin (workers);

-- ============================================================
-- Verificación: muestra las tablas creadas/modificadas
-- ============================================================
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('records', 'assignments', 'trailers_cierre')
order by table_name;
