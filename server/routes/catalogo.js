import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { enviarError } from "../lib/http.js";

export const catalogoRouter = Router();

catalogoRouter.get("/especialidades", async (_req, res) => {
  const { data, error } = await supabase
    .from("especialidades")
    .select("id, nombre, descripcion")
    .order("nombre");

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.json(data);
});

catalogoRouter.get("/pacientes", async (_req, res) => {
  const { data, error } = await supabase
    .from("pacientes")
    .select("id, nombre, apellido, documento, telefono, email, fecha_nacimiento")
    .order("apellido");

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.json(data);
});

catalogoRouter.get("/profesionales", async (req, res) => {
  const especialidadId = req.query.especialidadId ?? req.query.especialidad_id;

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

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  const lista = (data ?? []).map((profesional) => ({
    id: profesional.id,
    nombre: profesional.nombre,
    apellido: profesional.apellido,
    telefono: profesional.telefono,
    email: profesional.email,
    especialidades: (profesional.profesional_especialidades ?? []).map((item) => item.especialidades),
  }));

  const filtrada = especialidadId
    ? lista.filter((profesional) =>
        profesional.especialidades.some((item) => item?.id === especialidadId),
      )
    : lista;

  res.json(filtrada);
});

catalogoRouter.get("/horarios", async (req, res) => {
  const profesionalId = req.query.profesionalId ?? req.query.profesional_id;

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

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.json(data);
});
