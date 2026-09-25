-- Borra las tablas del modelo de citas (y users si la creaste a mano).
-- SQL Editor de Supabase → New query → Run.
-- No toca auth.users (login de Supabase Auth).

drop table if exists public.historial_citas cascade;
drop table if exists public.citas cascade;
drop table if exists public.horarios cascade;
drop table if exists public.profesional_especialidades cascade;
drop table if exists public.pacientes cascade;
drop table if exists public.profesionales cascade;
drop table if exists public.especialidades cascade;
drop table if exists public.users cascade;

drop function if exists public.registrar_historial_cita() cascade;

notify pgrst, 'reload schema';
