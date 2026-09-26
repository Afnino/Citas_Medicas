import { Router } from "express";
import { manejar } from "./http.js";

export function crearRutasCatalogo(casosCatalogo) {
  const router = Router();

  router.get(
    "/especialidades",
    manejar(async (_req, res) => {
      res.json(await casosCatalogo.especialidades());
    }),
  );

  router.get(
    "/pacientes",
    manejar(async (_req, res) => {
      res.json(await casosCatalogo.pacientes());
    }),
  );

  router.get(
    "/profesionales",
    manejar(async (req, res) => {
      const especialidadId = req.query.especialidadId ?? req.query.especialidad_id;
      res.json(await casosCatalogo.profesionales(especialidadId));
    }),
  );

  router.get(
    "/horarios",
    manejar(async (req, res) => {
      const profesionalId = req.query.profesionalId ?? req.query.profesional_id;
      res.json(await casosCatalogo.horarios(profesionalId));
    }),
  );

  router.get(
    "/doctors",
    manejar(async (_req, res) => {
      res.json(await casosCatalogo.doctores());
    }),
  );

  router.get(
    "/email",
    manejar(async (req, res) => {
      res.json(await casosCatalogo.emailPaciente(req.query.userId));
    }),
  );

  return router;
}
