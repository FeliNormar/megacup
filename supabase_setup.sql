-- Tabla de descargas activas
create table if not exists assignments (
  id text primary key,
  "naveId" text,
  "naveName" text,
  provider text,
  product text,
  po text,
  workers text[],
  "startTime" bigint,
  "endTime" bigint,
  status text default 'active'
);

-- Tabla de historial
create table if not exists records (
  id text primary key,
  "naveId" text,
  "naveName" text,
  provider text,
  product text,
  po text,
  workers text[],
  "startTime" bigint,
  "endTime" bigint,
  status text,
  "savedAt" bigint
);

-- Permisos públicos (para pruebas sin autenticación)
alter table assignments enable row level security;
alter table records enable row level security;

create policy "allow all assignments" on assignments for all using (true) with check (true);
create policy "allow all records" on records for all using (true) with check (true);
