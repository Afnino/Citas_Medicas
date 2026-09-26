import { ErrorDominio } from "../domain/errores.js";
import {
  DURACION_MINUTOS,
  diaSemanaIso,
  esFecha,
  estaDentroDelHorario,
  generarSlots,
  puedeCancelarse,
  seSolapan,
  sumarMinutos,
} from "../domain/reglas-cita.js";

export function crearCasosCitas(repositorioCitas) {
  return {
    async listar(filtros) {
      if (filtros.fecha && !esFecha(filtros.fecha)) {
        throw new ErrorDominio("fecha debe tener formato YYYY-MM-DD");
      }
      return repositorioCitas.listar(filtros);
    },

    async obtener(id) {
      const cita = await repositorioCitas.obtenerPorId(id);
      if (!cita) {
        throw new ErrorDominio("Cita no encontrada", 404);
      }
      return cita;
    },

    historial(id) {
      return repositorioCitas.historial(id);
    },

    async disponibilidad({ fecha, profesionalId, especialidadId, duracionMinutos }) {
      if (!fecha || !esFecha(fecha)) {
        throw new ErrorDominio("fecha es requerida con formato YYYY-MM-DD");
      }
      if (!profesionalId && !especialidadId) {
        throw new ErrorDominio("Debes enviar profesionalId o especialidadId");
      }

      const dia = diaSemanaIso(fecha);
      const duracion = Number(duracionMinutos ?? DURACION_MINUTOS);
      let profesionalIds = profesionalId ? [profesionalId] : [];

      if (!profesionalId && especialidadId) {
        profesionalIds = await repositorioCitas.idsPorEspecialidad(especialidadId);
      }

      if (profesionalIds.length === 0) {
        return { fecha, diaSemana: dia, duracionMinutos: duracion, profesionales: [] };
      }

      const [profesionales, horarios, citas] = await Promise.all([
        repositorioCitas.profesionalesPorIds(profesionalIds),
        repositorioCitas.horariosPorProfesionales(profesionalIds, dia),
        repositorioCitas.citasActivasPorProfesionales(profesionalIds, fecha),
      ]);

      return {
        fecha,
        diaSemana: dia,
        duracionMinutos: duracion,
        profesionales: profesionales.map((profesional) => {
          const bloques = horarios.filter((item) => item.profesional_id === profesional.id);
          const ocupadas = citas.filter((item) => item.profesional_id === profesional.id);
          return {
            profesional,
            consultorios: [...new Set(bloques.map((item) => item.consultorio).filter(Boolean))],
            horarios: bloques,
            slots: bloques.flatMap((bloque) => generarSlots(bloque, duracion, ocupadas)),
          };
        }),
      };
    },

    async agendar(entrada) {
      const {
        pacienteId,
        profesionalId,
        especialidadId,
        fecha,
        horaInicio,
        motivo = null,
        notas = null,
      } = entrada;
      let { horaFin } = entrada;

      if (!pacienteId || !profesionalId || !especialidadId || !fecha || !horaInicio) {
        throw new ErrorDominio(
          "pacienteId, profesionalId, especialidadId, fecha y horaInicio son obligatorios",
        );
      }
      if (!esFecha(fecha)) {
        throw new ErrorDominio("fecha debe tener formato YYYY-MM-DD");
      }

      horaFin = horaFin || sumarMinutos(horaInicio, DURACION_MINUTOS);

      const atiende = await repositorioCitas.profesionalAtiende(profesionalId, especialidadId);
      if (!atiende) {
        throw new ErrorDominio("El profesional no atiende esa especialidad");
      }

      const horarios = await repositorioCitas.horariosDelDia(profesionalId, diaSemanaIso(fecha));
      const cubre = horarios.some((horario) => estaDentroDelHorario(horaInicio, horaFin, horario));
      if (!cubre) {
        throw new ErrorDominio(
          "El horario no está dentro de la disponibilidad del profesional ese día",
        );
      }

      const ocupadas = await repositorioCitas.citasActivas(profesionalId, fecha);
      if (ocupadas.some((cita) => seSolapan(horaInicio, horaFin, cita.hora_inicio, cita.hora_fin))) {
        throw new ErrorDominio("Ese horario ya está ocupado", 409);
      }

      return repositorioCitas.crear({
        pacienteId,
        profesionalId,
        especialidadId,
        fecha,
        horaInicio,
        horaFin,
        motivo,
        notas,
      });
    },

    async cancelar(id, notas) {
      const cita = await repositorioCitas.obtenerPorId(id);
      if (!cita) {
        throw new ErrorDominio("Cita no encontrada", 404);
      }
      if (!puedeCancelarse(cita.estado)) {
        throw new ErrorDominio(`No se puede cancelar una cita en estado ${cita.estado}`);
      }
      return repositorioCitas.cancelar(id, notas || cita.notas);
    },
  };
}
