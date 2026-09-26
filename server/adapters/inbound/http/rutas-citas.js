import { Router } from "express";
import { campo, manejar } from "./http.js";

export function crearRutasCitas(casosCitas) {
  const router = Router();

  router.get(
    "/citas",
    manejar(async (req, res) => {
      res.json(
        await casosCitas.listar({
          fecha: req.query.fecha,
          profesionalId: req.query.profesionalId ?? req.query.profesional_id,
          pacienteId: req.query.pacienteId ?? req.query.paciente_id,
          estado: req.query.estado,
        }),
      );
    }),
  );

  router.get(
    "/citas/:id/historial",
    manejar(async (req, res) => {
      res.json(await casosCitas.historial(req.params.id));
    }),
  );

  router.get(
    "/citas/:id",
    manejar(async (req, res) => {
      res.json(await casosCitas.obtener(req.params.id));
    }),
  );

  router.get(
    "/disponibilidad",
    manejar(async (req, res) => {
      res.json(
        await casosCitas.disponibilidad({
          fecha: req.query.fecha,
          profesionalId: req.query.profesionalId ?? req.query.profesional_id,
          especialidadId: req.query.especialidadId ?? req.query.especialidad_id,
          duracionMinutos: req.query.duracionMinutos,
        }),
      );
    }),
  );

  router.post(
    "/citas",
    manejar(async (req, res) => {
      const cita = await casosCitas.agendar({
        pacienteId: campo(req.body, "pacienteId", "paciente_id"),
        profesionalId: campo(req.body, "profesionalId", "profesional_id"),
        especialidadId: campo(req.body, "especialidadId", "especialidad_id"),
        fecha: campo(req.body, "fecha", "fecha"),
        horaInicio: campo(req.body, "horaInicio", "hora_inicio"),
        horaFin: campo(req.body, "horaFin", "hora_fin"),
        motivo: campo(req.body, "motivo", "motivo") ?? null,
        notas: campo(req.body, "notas", "notas") ?? null,
      });
      res.status(201).json(cita);
    }),
  );

  router.patch(
    "/citas/:id/cancelar",
    manejar(async (req, res) => {
      res.json(await casosCitas.cancelar(req.params.id, campo(req.body ?? {}, "notas", "notas")));
    }),
  );

  return router;
}
