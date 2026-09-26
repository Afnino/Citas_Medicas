import { ErrorInfraestructura } from "../../../domain/errores.js";
import { ESTADOS_ACTIVOS } from "../../../domain/reglas-cita.js";
import { supabase } from "./cliente.js";

function lanzarSiError(error) {
  if (error) {
    throw new ErrorInfraestructura(error.message);
  }
}

export function crearRepositorioCatalogo() {
  return {
    async listarEspecialidades() {
      const { data, error } = await supabase
        .from("especialidades")
        .select("id, nombre, descripcion")
        .order("nombre");
      lanzarSiError(error);
      return data;
    },

    async listarPacientes() {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nombre, apellido, documento, telefono, email, fecha_nacimiento")
        .order("apellido");
      lanzarSiError(error);
      return data;
    },

    async listarProfesionales(especialidadId) {
      const { data, error } = await supabase
        .from("profesionales")
        .select(
          `
          id,
          nombre,
          apellido,
          telefono,
          email,
          profesional_especialidades (
            especialidad_id,
            especialidades ( id, nombre )
          )
        `,
        )
        .order("apellido");
      lanzarSiError(error);

      const lista = (data ?? []).map((profesional) => ({
        id: profesional.id,
        nombre: profesional.nombre,
        apellido: profesional.apellido,
        telefono: profesional.telefono,
        email: profesional.email,
        especialidades: (profesional.profesional_especialidades ?? []).map(
          (item) => item.especialidades,
        ),
      }));

      if (!especialidadId) {
        return lista;
      }

      return lista.filter((profesional) =>
        profesional.especialidades.some((item) => item?.id === especialidadId),
      );
    },

    async listarHorarios(profesionalId) {
      let query = supabase
        .from("horarios")
        .select(
          `
          id,
          profesional_id,
          dia_semana,
          hora_inicio,
          hora_fin,
          consultorio,
          activo,
          profesionales ( id, nombre, apellido )
        `,
        )
        .eq("activo", true)
        .order("dia_semana")
        .order("hora_inicio");

      if (profesionalId) {
        query = query.eq("profesional_id", profesionalId);
      }

      const { data, error } = await query;
      lanzarSiError(error);
      return data;
    },

    async listarDoctores() {
      const profesionales = await this.listarProfesionales();
      return profesionales.map((profesional) => ({
        id: profesional.id,
        name: `${profesional.nombre} ${profesional.apellido}`,
        specialty:
          profesional.especialidades
            ?.map((item) => item?.nombre)
            .filter(Boolean)
            .join(", ") || null,
      }));
    },

    async obtenerEmailPaciente(id) {
      const { data, error } = await supabase
        .from("pacientes")
        .select("email")
        .eq("id", id)
        .maybeSingle();
      lanzarSiError(error);
      return data;
    },
  };
}
