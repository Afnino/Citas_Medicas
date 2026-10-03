import { ServerBootstrap } from "./infraestructure/bootstrap/server.bootstrap.js";
import { connectDB } from "./infraestructure/config/data-base.js";
import { SpecialtyAdapter } from "./infraestructure/adapter/SpecialtyAdapter.js";
import { DoctorAdapter } from "./infraestructure/adapter/DoctorAdapter.js";
import app from "./infraestructure/web/app.js";

const serverBootstrap = new ServerBootstrap(app);

(async () => {
    try {
        // 1) Conectar a la base de datos antes de aceptar peticiones.
        await connectDB();
        // 2) Sembrar especialidades y medicos iniciales una sola vez (si las tablas estan vacias).
        await new SpecialtyAdapter().seedIfEmpty();
        await new DoctorAdapter().seedIfEmpty();
        // 3) Levantar el servidor HTTP.
        await serverBootstrap.initialize();
    } catch (error) {
        console.error("No se pudo iniciar la aplicacion:", error);
        process.exit(1);
    }
})();
