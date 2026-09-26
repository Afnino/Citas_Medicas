import { Router } from "express";
import { manejar } from "./http.js";

export function crearRutasIA(casosIA) {
  const router = Router();

  router.post(
    "/ia/chat",
    manejar(async (req, res) => {
      const mensaje = req.body?.mensaje;

      if (!mensaje) {
        return res.status(400).json({
          error: "El campo mensaje es obligatorio",
        });
      }

      const respuesta = await casosIA.conversar(mensaje);

      res.json({
        respuesta: respuesta.output_text,
      });
    }),
  );

  return router;
}