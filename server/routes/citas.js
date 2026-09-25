import { Router } from "express";
import { campo, enviarError } from "../lib/http.js";
import { supabase } from "../lib/supabase.js";
import {
  DURACION_MINUTOS,
  ESTADOS_ACTIVOS,
  diaSemanaIso,
  esFecha,
  estaDentroDelHorario,
  generarSlots,
  seSolapan,
  sumarMinutos,
} from "../lib/tiempo.js";

export const citasRouter = Router();

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

citasRouter.get("/citas", async (req, res) => {
  const fecha = req.query.fecha;
  const profesionalId = req.query.profesionalId ?? req.query.profesional_id;
  const pacienteId = req.query.pacienteId ?? req.query.paciente_id;
  const estado = req.query.estado;

  let query = supabase.from("citas").select(CITA_SELECT).order("fecha").order("hora_inicio");

  if (fecha) {
    if (!esFecha(fecha)) {
      enviarError(res, 400, "fecha debe tener formato YYYY-MM-DD");
      return;
    }
    query = query.eq("fecha", fecha);
  }

  if (profesionalId) query = query.eq("profesional_id", profesionalId);
  if (pacienteId) query = query.eq("paciente_id", pacienteId);
  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.json(data);
});

citasRouter.get("/citas/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("citas")
    .select(CITA_SELECT)
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  if (!data) {
    enviarError(res, 404, "Cita no encontrada");
    return;
  }

  res.json(data);
});

citasRouter.get("/citas/:id/historial", async (req, res) => {
  const { data, error } = await supabase
    .from("historial_citas")
    .select("id, cita_id, estado_anterior, estado_nuevo, observacion, registrado_en")
    .eq("cita_id", req.params.id)
    .order("registrado_en");

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.json(data);
});

citasRouter.get("/disponibilidad", async (req, res) => {
  const fecha = req.query.fecha;
  const profesionalId = req.query.profesionalId ?? req.query.profesional_id;
  const especialidadId = req.query.especialidadId ?? req.query.especialidad_id;
  const duracion = Number(req.query.duracionMinutos ?? DURACION_MINUTOS);

  if (!fecha || !esFecha(fecha)) {
    enviarError(res, 400, "fecha es requerida con formato YYYY-MM-DD");
    return;
  }

  if (!profesionalId && !especialidadId) {
    enviarError(res, 400, "Debes enviar profesionalId o especialidadId");
    return;
  }

  const dia = diaSemanaIso(fecha);
  let profesionalIds = profesionalId ? [profesionalId] : [];

  if (!profesionalId && especialidadId) {
    const { data: vinculos, error } = await supabase
      .from("profesional_especialidades")
      .select("profesional_id")
      .eq("especialidad_id", especialidadId);

    if (error) {
      enviarError(res, 500, error.message);
      return;
    }

    profesionalIds = (vinculos ?? []).map((item) => item.profesional_id);
  }

  if (profesionalIds.length === 0) {
    res.json({ fecha, diaSemana: dia, profesionales: [] });
    return;
  }

  const { data: profesionales, error: errorProfesionales } = await supabase
    .from("profesionales")
    .select("id, nombre, apellido")
    .in("id", profesionalIds);

  if (errorProfesionales) {
    enviarError(res, 500, errorProfesionales.message);
    return;
  }

  const { data: horarios, error: errorHorarios } = await supabase
    .from("horarios")
    .select("id, profesional_id, dia_semana, hora_inicio, hora_fin, consultorio, activo")
    .in("profesional_id", profesionalIds)
    .eq("dia_semana", dia)
    .eq("activo", true);

  if (errorHorarios) {
    enviarError(res, 500, errorHorarios.message);
    return;
  }

  const { data: citas, error: errorCitas } = await supabase
    .from("citas")
    .select("id, profesional_id, hora_inicio, hora_fin, estado")
    .in("profesional_id", profesionalIds)
    .eq("fecha", fecha)
    .in("estado", ESTADOS_ACTIVOS);

  if (errorCitas) {
    enviarError(res, 500, errorCitas.message);
    return;
  }

  const resultado = (profesionales ?? []).map((profesional) => {
    const bloques = (horarios ?? []).filter((item) => item.profesional_id === profesional.id);
    const ocupadas = (citas ?? []).filter((item) => item.profesional_id === profesional.id);
    const slots = bloques.flatMap((bloque) => generarSlots(bloque, duracion, ocupadas));

    return {
      profesional,
      consultorios: [...new Set(bloques.map((item) => item.consultorio).filter(Boolean))],
      horarios: bloques,
      slots,
    };
  });

  res.json({
    fecha,
    diaSemana: dia,
    duracionMinutos: duracion,
    profesionales: resultado,
  });
});

citasRouter.post("/citas", async (req, res) => {
  const pacienteId = campo(req.body, "pacienteId", "paciente_id");
  const profesionalId = campo(req.body, "profesionalId", "profesional_id");
  const especialidadId = campo(req.body, "especialidadId", "especialidad_id");
  const fecha = campo(req.body, "fecha", "fecha");
  const horaInicio = campo(req.body, "horaInicio", "hora_inicio");
  let horaFin = campo(req.body, "horaFin", "hora_fin");
  const motivo = campo(req.body, "motivo", "motivo") ?? null;
  const notas = campo(req.body, "notas", "notas") ?? null;

  if (!pacienteId || !profesionalId || !especialidadId || !fecha || !horaInicio) {
    enviarError(
      res,
      400,
      "pacienteId, profesionalId, especialidadId, fecha y horaInicio son obligatorios",
    );
    return;
  }

  if (!esFecha(fecha)) {
    enviarError(res, 400, "fecha debe tener formato YYYY-MM-DD");
    return;
  }

  horaFin = horaFin || sumarMinutos(horaInicio, DURACION_MINUTOS);

  const { data: vinculo, error: errorVinculo } = await supabase
    .from("profesional_especialidades")
    .select("profesional_id")
    .eq("profesional_id", profesionalId)
    .eq("especialidad_id", especialidadId)
    .maybeSingle();

  if (errorVinculo) {
    enviarError(res, 500, errorVinculo.message);
    return;
  }

  if (!vinculo) {
    enviarError(res, 400, "El profesional no atiende esa especialidad");
    return;
  }

  const { data: horarios, error: errorHorarios } = await supabase
    .from("horarios")
    .select("hora_inicio, hora_fin")
    .eq("profesional_id", profesionalId)
    .eq("dia_semana", diaSemanaIso(fecha))
    .eq("activo", true);

  if (errorHorarios) {
    enviarError(res, 500, errorHorarios.message);
    return;
  }

  const cubreHorario = (horarios ?? []).some((horario) =>
    estaDentroDelHorario(horaInicio, horaFin, horario),
  );

  if (!cubreHorario) {
    enviarError(res, 400, "El horario no está dentro de la disponibilidad del profesional ese día");
    return;
  }

  const { data: ocupadas, error: errorOcupadas } = await supabase
    .from("citas")
    .select("id, hora_inicio, hora_fin")
    .eq("profesional_id", profesionalId)
    .eq("fecha", fecha)
    .in("estado", ESTADOS_ACTIVOS);

  if (errorOcupadas) {
    enviarError(res, 500, errorOcupadas.message);
    return;
  }

  const choque = (ocupadas ?? []).some((cita) =>
    seSolapan(horaInicio, horaFin, cita.hora_inicio, cita.hora_fin),
  );

  if (choque) {
    enviarError(res, 409, "Ese horario ya está ocupado");
    return;
  }

  const { data, error } = await supabase
    .from("citas")
    .insert({
      paciente_id: pacienteId,
      profesional_id: profesionalId,
      especialidad_id: especialidadId,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      estado: "programada",
      motivo,
      notas,
    })
    .select(CITA_SELECT)
    .single();

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.status(201).json(data);
});

citasRouter.patch("/citas/:id/cancelar", async (req, res) => {
  const notas = campo(req.body ?? {}, "notas", "notas");

  const { data: cita, error: errorCita } = await supabase
    .from("citas")
    .select("id, estado, notas")
    .eq("id", req.params.id)
    .maybeSingle();

  if (errorCita) {
    enviarError(res, 500, errorCita.message);
    return;
  }

  if (!cita) {
    enviarError(res, 404, "Cita no encontrada");
    return;
  }

  if (!ESTADOS_ACTIVOS.includes(cita.estado)) {
    enviarError(res, 400, `No se puede cancelar una cita en estado ${cita.estado}`);
    return;
  }

  const { data, error } = await supabase
    .from("citas")
    .update({
      estado: "cancelada",
      notas: notas || cita.notas,
    })
    .eq("id", req.params.id)
    .select(CITA_SELECT)
    .single();

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.json(data);
});
