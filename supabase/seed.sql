-- 5 filas de ejemplo en cada tabla. Ejecutar DESPUÉS de schema.sql.
-- Si ya corriste un seed anterior, este truncate deja exactamente 5 filas por tabla.

truncate table
  public.historial_citas,
  public.citas,
  public.horarios,
  public.profesional_especialidades,
  public.pacientes,
  public.profesionales,
  public.especialidades
restart identity cascade;

insert into public.especialidades (id, nombre, descripcion) values
  ('a1a1a1a1-0001-4000-8000-000000000001', 'Medicina general', 'Consultas, controles y diagnósticos iniciales'),
  ('a1a1a1a1-0001-4000-8000-000000000002', 'Pediatría', 'Atención de niños y adolescentes'),
  ('a1a1a1a1-0001-4000-8000-000000000003', 'Cardiología', 'Corazón y sistema circulatorio'),
  ('a1a1a1a1-0001-4000-8000-000000000004', 'Dermatología', 'Piel, cabello y uñas'),
  ('a1a1a1a1-0001-4000-8000-000000000005', 'Odontología', 'Salud oral y tratamientos dentales');

insert into public.pacientes (id, nombre, apellido, documento, telefono, email, fecha_nacimiento) values
  ('b2b2b2b2-0001-4000-8000-000000000001', 'Laura', 'Gómez', '1020304050', '3001112233', 'laura.gomez@correo.com', '1994-03-12'),
  ('b2b2b2b2-0001-4000-8000-000000000002', 'Andrés', 'Pérez', '1122334455', '3104445566', 'andres.perez@correo.com', '1988-11-02'),
  ('b2b2b2b2-0001-4000-8000-000000000003', 'Camila', 'Rodríguez', '1002003004', '3207778899', 'camila.rodriguez@correo.com', '2016-07-21'),
  ('b2b2b2b2-0001-4000-8000-000000000004', 'Diego', 'Vargas', '1034567890', '3012223344', 'diego.vargas@correo.com', '1979-05-30'),
  ('b2b2b2b2-0001-4000-8000-000000000005', 'Sofía', 'Castro', '1011223344', '3125556677', 'sofia.castro@correo.com', '2001-09-18');

insert into public.profesionales (id, nombre, apellido, documento, telefono, email) values
  ('c3c3c3c3-0001-4000-8000-000000000001', 'María', 'Salazar', '52123456', '3015556677', 'dra.salazar@clinica.com'),
  ('c3c3c3c3-0001-4000-8000-000000000002', 'Jorge', 'Martínez', '79876543', '3158889900', 'dr.martinez@clinica.com'),
  ('c3c3c3c3-0001-4000-8000-000000000003', 'Elena', 'Ruiz', '52987654', '3182223344', 'dra.ruiz@clinica.com'),
  ('c3c3c3c3-0001-4000-8000-000000000004', 'Pablo', 'Herrera', '80765432', '3009990011', 'dr.herrera@clinica.com'),
  ('c3c3c3c3-0001-4000-8000-000000000005', 'Carolina', 'Mejía', '52456789', '3174445566', 'dra.mejia@clinica.com');

insert into public.profesional_especialidades (profesional_id, especialidad_id) values
  ('c3c3c3c3-0001-4000-8000-000000000001', 'a1a1a1a1-0001-4000-8000-000000000001'),
  ('c3c3c3c3-0001-4000-8000-000000000002', 'a1a1a1a1-0001-4000-8000-000000000003'),
  ('c3c3c3c3-0001-4000-8000-000000000003', 'a1a1a1a1-0001-4000-8000-000000000004'),
  ('c3c3c3c3-0001-4000-8000-000000000004', 'a1a1a1a1-0001-4000-8000-000000000002'),
  ('c3c3c3c3-0001-4000-8000-000000000005', 'a1a1a1a1-0001-4000-8000-000000000005');

insert into public.horarios (id, profesional_id, dia_semana, hora_inicio, hora_fin, consultorio, activo) values
  ('e5e5e5e5-0001-4000-8000-000000000001', 'c3c3c3c3-0001-4000-8000-000000000001', 1, '08:00', '12:00', 'Consultorio 101', true),
  ('e5e5e5e5-0001-4000-8000-000000000002', 'c3c3c3c3-0001-4000-8000-000000000002', 2, '09:00', '13:00', 'Consultorio 202', true),
  ('e5e5e5e5-0001-4000-8000-000000000003', 'c3c3c3c3-0001-4000-8000-000000000003', 3, '14:00', '18:00', 'Consultorio 303', true),
  ('e5e5e5e5-0001-4000-8000-000000000004', 'c3c3c3c3-0001-4000-8000-000000000004', 4, '08:00', '12:00', 'Consultorio 104', true),
  ('e5e5e5e5-0001-4000-8000-000000000005', 'c3c3c3c3-0001-4000-8000-000000000005', 5, '10:00', '16:00', 'Consultorio 305', true);

insert into public.citas (
  id, paciente_id, profesional_id, especialidad_id,
  fecha, hora_inicio, hora_fin, estado, motivo, notas
) values
  (
    'd4d4d4d4-0001-4000-8000-000000000001',
    'b2b2b2b2-0001-4000-8000-000000000001',
    'c3c3c3c3-0001-4000-8000-000000000001',
    'a1a1a1a1-0001-4000-8000-000000000001',
    current_date + 2, '09:00', '09:30',
    'programada',
    'Control general anual',
    'Primera vez en la clínica'
  ),
  (
    'd4d4d4d4-0001-4000-8000-000000000002',
    'b2b2b2b2-0001-4000-8000-000000000002',
    'c3c3c3c3-0001-4000-8000-000000000002',
    'a1a1a1a1-0001-4000-8000-000000000003',
    current_date + 1, '10:00', '10:45',
    'confirmada',
    'Dolor en el pecho',
    'Llevar electrocardiograma previo'
  ),
  (
    'd4d4d4d4-0001-4000-8000-000000000003',
    'b2b2b2b2-0001-4000-8000-000000000003',
    'c3c3c3c3-0001-4000-8000-000000000004',
    'a1a1a1a1-0001-4000-8000-000000000002',
    current_date - 10, '08:30', '09:00',
    'completada',
    'Control de crecimiento',
    'Evolución adecuada'
  ),
  (
    'd4d4d4d4-0001-4000-8000-000000000004',
    'b2b2b2b2-0001-4000-8000-000000000004',
    'c3c3c3c3-0001-4000-8000-000000000003',
    'a1a1a1a1-0001-4000-8000-000000000004',
    current_date - 3, '15:00', '15:30',
    'cancelada',
    'Manchas en la piel',
    'El paciente reprogramó'
  ),
  (
    'd4d4d4d4-0001-4000-8000-000000000005',
    'b2b2b2b2-0001-4000-8000-000000000005',
    'c3c3c3c3-0001-4000-8000-000000000005',
    'a1a1a1a1-0001-4000-8000-000000000005',
    current_date - 1, '11:00', '11:40',
    'no_asistio',
    'Limpieza dental',
    'No se presentó a la cita'
  );

-- historial_citas queda con 5 filas por el trigger al crear cada cita.

notify pgrst, 'reload schema';
