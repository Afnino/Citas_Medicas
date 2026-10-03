import express from "express";
import path from "path";
import userRoutes from "../routes/UserRoutes.js";
import catalogRoutes from "../routes/CatalogRoutes.js";
import appointmentRoutes from "../routes/AppointmentRoutes.js";
import assistantRoutes from "../routes/AssistantRoutes.js";
import { errorHandler } from "./http.js";

class App {

  private app: express.Application;

  constructor() {
    this.app = express();
    this.middlewares();
    this.routes();
    this.errorHandling();
  }

  private middlewares(): void {
    this.app.use(express.json());
    const publicDir = path.join(process.cwd(), "public");
    this.app.use(express.static(publicDir));
  }

  private routes(): void {
    this.app.use("/api", userRoutes);
    this.app.use("/api", catalogRoutes);
    this.app.use("/api", appointmentRoutes);
    this.app.use("/api", assistantRoutes);
  }

  private errorHandling(): void {
    // Debe ir despues de las rutas para capturar sus errores.
    this.app.use(errorHandler);
  }

  getApp() {
    return this.app;
  }

}
export default new App().getApp();
