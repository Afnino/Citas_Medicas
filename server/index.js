import { crearCasosCatalogo } from "./application/casos-catalogo.js";
import { crearCasosCitas } from "./application/casos-citas.js";
import { crearCasosIA } from "./application/casos-ia.js";

import { crearApp } from "./adapters/inbound/http/app.js";

import { crearRepositorioCatalogo } from "./adapters/outbound/supabase/repositorio-catalogo.js";
import { crearRepositorioCitas } from "./adapters/outbound/supabase/repositorio-citas.js";


const casosCatalogo = crearCasosCatalogo(
  crearRepositorioCatalogo()
);

const casosCitas = crearCasosCitas(
  crearRepositorioCitas()
);

const casosIA = crearCasosIA({
  casosCatalogo,
  casosCitas,
});


const app = crearApp({
  casosCatalogo,
  casosCitas,
  casosIA,
});


const port = process.env.PORT ?? 3001;

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});