import { ErrorInfraestructura } from "../../../domain/errores.js";
import { ESTADOS_ACTIVOS } from "../../../domain/reglas-cita.js";
import { supabase } from "./cliente.js";

const CITA_SELECT = `
  id,
  paciente_id,
  profesional_id,
  especialidad_id,
  fecha,
  hora_inicio,
  hora_fin,
  estado,
  motivo,
  notas,
  created_at,
  pacientes ( id, nombre, apellido, documento, email ),
  profesionales ( id, nombre, apellido, email ),
  especialidades ( id, nombre )
`;

function lanzarSiError(error) {
  if (error) {
    throw new ErrorInfraestructura(error.message);
  }
}

export function crearRepositorioCitas() {
  return {
    async listar({ fecha, profesionalId, pacienteId, estado }) {
      let query = supabase.from("citas").select(CITA_SELECT).order("fecha").order("hora_inicio");
      if (fecha) query = query.eq("fecha", fecha);
      if (profesionalId) query = query.eq("profesional_id", profesionalId);
      if (pacienteId) query = query.eq("paciente_id", pacienteId);
      if (estado) query = query.eq("estado", estado);
      const { data, error } = await query;
      lanzarSiError(error);
      return data;
    },

    async obtenerPorId(id) {
      const { data, error } = await supabase
        .from("citas")
        .select(CITA_SELECT)
        .eq("id", id)
        .maybeSingle();
      lanzarSiError(error);
      return data;
    },

    async historial(id) {
      const { data, error } = await supabase
        .from("historial_citas")
        .select("id, cita_id, estado_anterior, estado_nuevo, observacion, registrado_en")
        .eq("cita_id", id)
        .order("registrado_en");
      lanzarSiError(error);
      return data;
    },

    async crear(datos) {
      const { data, error } = await supabase
        .from("citas")
        .insert({
          paciente_id: datos.pacienteId,
          profesional_id: datos.profesionalId,
          especialidad_id: datos.especialidadId,
          fecha: datos.fecha,
          hora_inicio: datos.horaInicio,
          hora_fin: datos.horaFin,
          estado: "programada",
          motivo: datos.motivo,
          notas: datos.notas,
        })
        .select(CITA_SELECT)
        .single();
      lanzarSiError(error);
      return data;
    },

    async cancelar(id, notas) {
      const { data, error } = await supabase
        .from("citas")
        .update({ estado: "cancelada", notas })
        .eq("id", id)
        .select(CITA_SELECT)
        .single();
      lanzarSiError(error);
      return data;
    },

    async profesionalAtiende(profesionalId, especialidadId) {
      const { data, error } = await supabase
        .from("profesional_especialidades")
        .select("profesional_id")
        .eq("profesional_id", profesionalId)
        .eq("especialidad_id", especialidadId)
        .maybeSingle();
      lanzarSiError(error);
      return Boolean(data);
    },

    async horariosDelDia(profesionalId, diaSemana) {
      const { data, error } = await supabase
        .from("horarios")
        .select("hora_inicio, hora_fin")
        .eq("profesional_id", profesionalId)
        .eq("dia_semana", diaSemana)
        .eq("activo", true);
      lanzarSiError(error);
      return data ?? [];
    },

    async citasActivas(profesionalId, fecha) {
      const { data, error } = await supabase
        .from("citas")
        .select("id, hora_inicio, hora_fin")
        .eq("profesional_id", profesionalId)
        .eq("fecha", fecha)
        .in("estado", ESTADOS_ACTIVOS);
      lanzarSiError(error);
      return data ?? [];
    },

    async idsPorEspecialidad(especialidadId) {
      const { data, error } = await supabase
        .from("profesional_especialidades")
        .select("profesional_id")
        .eq("especialidad_id", especialidadId);
      lanzarSiError(error);
      return (data ?? []).map((item) => item.profesional_id);
    },

    async profesionalesPorIds(ids) {
      const { data, error } = await supabase
        .from("profesionales")
        .select("id, nombre, apellido")
        .in("id", ids);
      lanzarSiError(error);
      return data ?? [];
    },

    async horariosPorProfesionales(ids, diaSemana) {
      const { data, error } = await supabase
        .from("horarios")
        .select("id, profesional_id, dia_semana, hora_inicio, hora_fin, consultorio, activo")
        .in("profesional_id", ids)
        .eq("dia_semana", diaSemana)
        .eq("activo", true);
      lanzarSiError(error);
      return data ?? [];
    },

    async citasActivasPorProfesionales(ids, fecha) {
      const { data, error } = await supabase
        .from("citas")
        .select("id, profesional_id, hora_inicio, hora_fin, estado")
        .in("profesional_id", ids)
        .eq("fecha", fecha)
        .in("estado", ESTADOS_ACTIVOS);
      lanzarSiError(error);
      return data ?? [];
    },
  };
}
