import { ErrorDominio } from "../domain/errores.js";

export function crearCasosCatalogo(repositorioCatalogo) {
  return {
    especialidades: () => repositorioCatalogo.listarEspecialidades(),
    pacientes: () => repositorioCatalogo.listarPacientes(),
    profesionales: (especialidadId) => repositorioCatalogo.listarProfesionales(especialidadId),
    horarios: (profesionalId) => repositorioCatalogo.listarHorarios(profesionalId),
    doctores: () => repositorioCatalogo.listarDoctores(),
    async emailPaciente(userId) {
      if (!userId) {
        throw new ErrorDominio("userId is required");
      }
      const data = await repositorioCatalogo.obtenerEmailPaciente(userId);
      if (!data) {
        throw new ErrorDominio("Paciente no encontrado", 404);
      }
      return data;
    },
  };
}
