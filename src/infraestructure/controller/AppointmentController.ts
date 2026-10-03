import { Request, Response } from "express";
import { AppointmentApplication } from "../../application/AppointmentApplication.js";
import { ApiError } from "../../shared/ApiError.js";
import { loadAppointmentData, loadRangeQuery } from "../util/appointment-validation.js";

export class AppointmentController {
  private app: AppointmentApplication;

  constructor(application: AppointmentApplication) {
    this.app = application;
  }

  private parseId(value: unknown): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Cita invalida");
    return id;
  }

  async bookAppointment(req: Request, res: Response): Promise<void> {
    const { doctorId, date, time, reason } = loadAppointmentData(req.body);
    const AppointmentId = await this.app.bookAppointment(req.user!.id, doctorId, date, time, reason);
    res.status(201).json({ message: "Cita agendada con exito", AppointmentId });
  }

  async getMyAppointments(req: Request, res: Response): Promise<void> {
    res.status(200).json(await this.app.getMyAppointments(req.user!.id));
  }

  async getAppointmentById(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    res.status(200).json(await this.app.getAppointmentById(user.id, user.role, this.parseId(req.params.id)));
  }

  async cancelAppointment(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    await this.app.cancelAppointment(user.id, user.role, this.parseId(req.params.id));
    res.status(200).json({ message: "Cita cancelada" });
  }

  async getAgenda(req: Request, res: Response): Promise<void> {
    const { from, to } = loadRangeQuery(req.query);
    res.status(200).json(await this.app.getAgenda(req.user!.id, from, to));
  }

  async getDoctorAgenda(req: Request, res: Response): Promise<void> {
    const { from, to } = loadRangeQuery(req.query);
    res.status(200).json(await this.app.getDoctorAgenda(this.parseId(req.params.id), from, to));
  }
}
