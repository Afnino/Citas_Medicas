/**
 * Puertos (contratos) que el dominio/aplicación espera.
 * Los adaptadores de Supabase implementan estas funciones.
 *
 * repositorioCatalogo:
 *   listarEspecialidades()
 *   listarPacientes()
 *   listarProfesionales()
 *   listarHorarios(profesionalId)
 *   listarDoctores()
 *   obtenerEmailPaciente(id)
 *
 * repositorioCitas:
 *   listar(filtros)
 *   obtenerPorId(id)
 *   historial(id)
 *   crear(datos)
 *   cancelar(id, notas)
 *   profesionalAtiende(profesionalId, especialidadId)
 *   horariosDelDia(profesionalId, diaSemana)
 *   citasActivas(profesionalId, fecha)
 *   idsPorEspecialidad(especialidadId)
 *   profesionalesPorIds(ids)
 *   horariosPorProfesionales(ids, diaSemana)
 *   citasActivasPorProfesionales(ids, fecha)
 */
export {};
