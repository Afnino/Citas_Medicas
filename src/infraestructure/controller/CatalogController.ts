import { Request, Response } from "express";
import { SpecialtyApplication } from "../../application/SpecialtyApplication.js";
import { DoctorApplication } from "../../application/DoctorApplication.js";
import { AvailabilityApplication } from "../../application/AvailabilityApplication.js";
import { ApiError } from "../../shared/ApiError.js";
import { loadDoctorData, loadScheduleData, loadSpecialtyData } from "../util/catalog-validation.js";
import { loadDateQuery } from "../util/appointment-validation.js";

/**
 * Controlador del catalogo: especialidades, medicos y disponibilidad.
 * Igual que UserController: cada metodo se monta con `asyncHandler`.
 */
export class CatalogController {
  private specialtyApp: SpecialtyApplication;
  private doctorApp: DoctorApplication;
  private availabilityApp: AvailabilityApplication;

  constructor(specialtyApp: SpecialtyApplication, doctorApp: DoctorApplication, availabilityApp: AvailabilityApplication) {
    this.specialtyApp = specialtyApp;
    this.doctorApp = doctorApp;
    this.availabilityApp = availabilityApp;
  }

  private parseId(value: unknown, label: string): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, `${label} invalido`);
    return id;
  }

  // --- Especialidades ---
  async getAllSpecialties(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await this.specialtyApp.getAllSpecialties());
  }

  async createSpecialty(req: Request, res: Response): Promise<void> {
    const specialty = loadSpecialtyData(req.body);
    const SpecialtyId = await this.specialtyApp.createSpecialty(specialty);
    res.status(201).json({ message: "Especialidad creada con exito", SpecialtyId });
  }

  // --- Medicos ---
  async getAllDoctors(req: Request, res: Response): Promise<void> {
    const specialtyId = req.query.specialtyId !== undefined ? this.parseId(req.query.specialtyId, "Especialidad") : undefined;
    res.status(200).json(await this.doctorApp.getAllDoctors(specialtyId));
  }

  async getDoctorById(req: Request, res: Response): Promise<void> {
    const doctor = await this.doctorApp.getDoctorById(this.parseId(req.params.id, "Medico"));
    if (!doctor) throw new ApiError(404, "Medico no encontrado");
    res.status(200).json(doctor);
  }

  async createDoctor(req: Request, res: Response): Promise<void> {
    const doctor = loadDoctorData(req.body);
    const DoctorId = await this.doctorApp.createDoctor(doctor);
    res.status(201).json({ message: "Medico creado con exito", DoctorId });
  }

  async getSchedules(req: Request, res: Response): Promise<void> {
    res.status(200).json(await this.doctorApp.getSchedulesByDoctor(this.parseId(req.params.id, "Medico")));
  }

  async addSchedule(req: Request, res: Response): Promise<void> {
    const doctorId = this.parseId(req.params.id, "Medico");
    const schedule = loadScheduleData(req.body);
    const ScheduleId = await this.doctorApp.addSchedule({ doctorId, ...schedule });
    res.status(201).json({ message: "Horario creado con exito", ScheduleId });
  }

  // --- Disponibilidad ---
  async getDoctorAvailability(req: Request, res: Response): Promise<void> {
    const doctorId = this.parseId(req.params.id, "Medico");
    const { date } = loadDateQuery(req.query);
    const slots = await this.availabilityApp.getSlots(doctorId, date);
    res.status(200).json({ doctorId, date, slots: slots.map((s) => s.time) });
  }

  async getAvailability(req: Request, res: Response): Promise<void> {
    const { date, specialtyId } = loadDateQuery(req.query);
    const available = await this.availabilityApp.getAvailableDoctors(date, specialtyId);
    res.status(200).json(
      available.map((a) => ({ doctorId: a.doctor.id, doctor: a.doctor.name, date, slots: a.slots.map((s) => s.time) }))
    );
  }
}
