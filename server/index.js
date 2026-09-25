import express from "express";
import cors from "cors";
import { catalogoRouter } from "./routes/catalogo.js";
import { citasRouter } from "./routes/citas.js";
import { supabase } from "./lib/supabase.js";
import { enviarError } from "./lib/http.js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    servicio: "Citas médicas",
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

app.use(catalogoRouter);
app.use(citasRouter);

app.get("/doctors", async (_req, res) => {
  const { data, error } = await supabase
    .from("profesionales")
    .select(
      `
      id,
      nombre,
      apellido,
      profesional_especialidades (
        especialidades ( nombre )
      )
    `,
    )
    .order("apellido");

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  res.json(
    (data ?? []).map((profesional) => ({
      id: profesional.id,
      name: `${profesional.nombre} ${profesional.apellido}`,
      specialty:
        profesional.profesional_especialidades
          ?.map((item) => item.especialidades?.nombre)
          .filter(Boolean)
          .join(", ") || null,
    })),
  );
});

app.get("/email", async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    enviarError(res, 400, "userId is required");
    return;
  }

  const { data, error } = await supabase
    .from("pacientes")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    enviarError(res, 500, error.message);
    return;
  }

  if (!data) {
    enviarError(res, 404, "Paciente no encontrado");
    return;
  }

  res.json({ email: data.email });
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
