import express from "express";
import cors from "cors";
import { crearRutasCatalogo } from "./rutas-catalogo.js";
import { crearRutasCitas } from "./rutas-citas.js";

export function crearApp({ casosCatalogo, casosCitas }) {
  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      servicio: "Citas médicas",
      arquitectura: "hexagonal",
      endpoints: {
        catalogo: [
          "GET /especialidades",
          "GET /pacientes",
          "GET /profesionales?especialidadId=",
          "GET /horarios?profesionalId=",
          "GET /doctors",
        ],
        agenda: [
          "GET /citas?fecha=&profesionalId=&pacienteId=&estado=",
          "GET /citas/:id",
          "GET /citas/:id/historial",
          "GET /disponibilidad?fecha=&profesionalId=&especialidadId=",
          "POST /citas",
          "PATCH /citas/:id/cancelar",
        ],
      },
    });
  });

  app.use(crearRutasCatalogo(casosCatalogo));
  app.use(crearRutasCitas(casosCitas));
  return app;
}
