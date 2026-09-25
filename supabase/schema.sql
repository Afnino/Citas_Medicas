-- PostgreSQL para Supabase (PostgREST expone el schema public como REST).
-- Dashboard → SQL Editor → pegar este archivo → Run.
-- Luego ejecutar seed.sql.
--
-- Endpoints que PostgREST crea automáticamente:
--   GET/POST/PATCH/DELETE  {SUPABASE_URL}/rest/v1/especialidades
--   GET/POST/PATCH/DELETE  {SUPABASE_URL}/rest/v1/pacientes
--   GET/POST/PATCH/DELETE  {SUPABASE_URL}/rest/v1/profesionales
--   GET/POST/PATCH/DELETE  {SUPABASE_URL}/rest/v1/profesional_especialidades
--   GET/POST/PATCH/DELETE  {SUPABASE_URL}/rest/v1/horarios
--   GET/POST/PATCH/DELETE  {SUPABASE_URL}/rest/v1/citas
--   GET                     {SUPABASE_URL}/rest/v1/historial_citas

create extension if not exists pgcrypto;

create table if not exists public.especialidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  created_at timestamptz not null default now()
);

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  documento text not null unique,
  telefono text,
  email text,
  fecha_nacimiento date,
  created_at timestamptz not null default now()
);

create table if not exists public.profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  documento text not null unique,
  telefono text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.profesional_especialidades (
  profesional_id uuid not null references public.profesionales (id) on delete cascade,
  especialidad_id uuid not null references public.especialidades (id) on delete restrict,
  primary key (profesional_id, especialidad_id)
);

-- dia_semana: 1 = lunes ... 7 = domingo (ISO).
create table if not exists public.horarios (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references public.profesionales (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  consultorio text,
  activo boolean not null default true,
  constraint horarios_rango_valido check (hora_fin > hora_inicio),
  unique (profesional_id, dia_semana, hora_inicio, hora_fin)
);

create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  profesional_id uuid not null references public.profesionales (id) on delete restrict,
  especialidad_id uuid not null references public.especialidades (id) on delete restrict,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  estado text not null default 'programada'
    check (estado in ('programada', 'confirmada', 'completada', 'cancelada', 'no_asistio')),
  motivo text,
  notas text,
  created_at timestamptz not null default now(),
  constraint citas_rango_valido check (hora_fin > hora_inicio)
);

create table if not exists public.historial_citas (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.citas (id) on delete cascade,
  estado_anterior text,
  estado_nuevo text not null,
  observacion text,
  registrado_en timestamptz not null default now()
);

create index if not exists idx_citas_paciente on public.citas (paciente_id);
create index if not exists idx_citas_profesional on public.citas (profesional_id);
create index if not exists idx_citas_fecha on public.citas (fecha);
create index if not exists idx_horarios_profesional on public.horarios (profesional_id);
create index if not exists idx_historial_cita on public.historial_citas (cita_id);

comment on table public.especialidades is 'Especialidades médicas';
comment on table public.pacientes is 'Pacientes de la clínica';
comment on table public.profesionales is 'Profesionales de la salud';
comment on table public.profesional_especialidades is 'Especialidades que atiende cada profesional';
comment on table public.horarios is 'Horarios de atención por profesional';
comment on table public.citas is 'Citas médicas';
comment on table public.historial_citas is 'Historial de cambios de estado de las citas';

create or replace function public.registrar_historial_cita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.historial_citas (cita_id, estado_anterior, estado_nuevo, observacion)
    values (new.id, null, new.estado, 'Cita creada');
    return new;
  end if;

  if tg_op = 'UPDATE' and old.estado is distinct from new.estado then
    insert into public.historial_citas (cita_id, estado_anterior, estado_nuevo, observacion)
    values (new.id, old.estado, new.estado, 'Cambio de estado');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_historial_cita on public.citas;
create trigger trg_historial_cita
after insert or update of estado on public.citas
for each row
execute function public.registrar_historial_cita();

-- PostgREST / Supabase: roles de la API
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.especialidades,
  public.pacientes,
  public.profesionales,
  public.profesional_especialidades,
  public.horarios,
  public.citas,
  public.historial_citas
to anon, authenticated, service_role;

-- RLS activo (Supabase lo exige). Políticas abiertas para la demo académica.
alter table public.especialidades enable row level security;
alter table public.pacientes enable row level security;
alter table public.profesionales enable row level security;
alter table public.profesional_especialidades enable row level security;
alter table public.horarios enable row level security;
alter table public.citas enable row level security;
alter table public.historial_citas enable row level security;

drop policy if exists especialidades_all on public.especialidades;
create policy especialidades_all on public.especialidades
  for all to anon, authenticated using (true) with check (true);

drop policy if exists pacientes_all on public.pacientes;
create policy pacientes_all on public.pacientes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists profesionales_all on public.profesionales;
create policy profesionales_all on public.profesionales
  for all to anon, authenticated using (true) with check (true);

drop policy if exists profesional_especialidades_all on public.profesional_especialidades;
create policy profesional_especialidades_all on public.profesional_especialidades
  for all to anon, authenticated using (true) with check (true);

drop policy if exists horarios_all on public.horarios;
create policy horarios_all on public.horarios
  for all to anon, authenticated using (true) with check (true);

drop policy if exists citas_all on public.citas;
create policy citas_all on public.citas
  for all to anon, authenticated using (true) with check (true);

drop policy if exists historial_citas_select on public.historial_citas;
create policy historial_citas_select on public.historial_citas
  for select to anon, authenticated using (true);

drop policy if exists historial_citas_insert on public.historial_citas;
create policy historial_citas_insert on public.historial_citas
  for insert to anon, authenticated with check (true);

notify pgrst, 'reload schema';
