import { Appointment, AppointmentDetail } from "../domain/Appointment.js";
import { AppointmentPort } from "../domain/AppointmentPort.js";
import { DoctorPort } from "../domain/DoctorPort.js";
import { SpecialtyPort } from "../domain/SpecialtyPort.js";
import { ApiError } from "../shared/ApiError.js";
import { isValidDate, isValidTime } from "../shared/dates.js";
import { AvailabilityApplication } from "./AvailabilityApplication.js";

export interface AgendaDay {
    date: string;
    appointments: AppointmentDetail[];
}

export class AppointmentApplication {
    private port: AppointmentPort;
    private doctorPort: DoctorPort;
    private specialtyPort: SpecialtyPort;
    private availability: AvailabilityApplication;

    constructor(
        port: AppointmentPort,
        doctorPort: DoctorPort,
        specialtyPort: SpecialtyPort,
        availability: AvailabilityApplication
    ) {
        this.port = port;
        this.doctorPort = doctorPort;
        this.specialtyPort = specialtyPort;
        this.availability = availability;
    }

    // Agrega nombre del medico y de la especialidad a cada cita.
    private async toDetail(appointments: Appointment[]): Promise<AppointmentDetail[]> {
        const [doctors, specialties] = await Promise.all([
            this.doctorPort.getAllDoctors(),
            this.specialtyPort.getAllSpecialties(),
        ]);
        const specialtyNames = new Map(specialties.map((s) => [s.id, s.name]));
        const doctorInfo = new Map(doctors.map((d) => [d.id, { name: d.name, specialty: specialtyNames.get(d.specialtyId) ?? "" }]));
        return appointments.map((a) => ({
            ...a,
            doctorName: doctorInfo.get(a.doctorId)?.name ?? "Medico",
            specialtyName: doctorInfo.get(a.doctorId)?.specialty ?? "",
        }));
    }

    async bookAppointment(userId: number, doctorId: number, date: string, time: string, reason: string): Promise<number> {
        if (!isValidDate(date) || !isValidTime(time)) {
            throw new ApiError(400, "Fecha u hora invalida");
        }
        // Solo se puede agendar un horario que hoy este realmente libre.
        const slots = await this.availability.getSlots(doctorId, date);
        if (!slots.some((s) => s.time === time)) {
            throw new ApiError(409, "Ese horario no esta disponible");
        }
        return this.port.createAppointment({ userId, doctorId, date, time, reason, status: "scheduled" });
    }

    async cancelAppointment(userId: number, role: string, id: number): Promise<boolean> {
        const appointment = await this.port.getAppointmentById(id);
        // Si la cita es de otra persona respondemos igual que si no existiera.
        if (!appointment || (appointment.userId !== userId && role !== "admin")) {
            throw new ApiError(404, "Cita no encontrada");
        }
        if (appointment.status === "cancelled") {
            throw new ApiError(409, "La cita ya estaba cancelada");
        }
        return this.port.cancelAppointment(id);
    }

    async getAppointmentById(userId: number, role: string, id: number): Promise<AppointmentDetail> {
        const appointment = await this.port.getAppointmentById(id);
        if (!appointment || (appointment.userId !== userId && role !== "admin")) {
            throw new ApiError(404, "Cita no encontrada");
        }
        const [detail] = await this.toDetail([appointment]);
        return detail!;
    }

    async getMyAppointments(userId: number, from?: string, to?: string, includeCancelled: boolean = true): Promise<AppointmentDetail[]> {
        const appointments = await this.port.getAppointmentsByUser(userId, from, to);
        const filtered = includeCancelled ? appointments : appointments.filter((a) => a.status === "scheduled");
        return this.toDetail(filtered);
    }

    /** Proximas citas programadas (desde hoy). */
    async getUpcomingAppointments(userId: number): Promise<AppointmentDetail[]> {
        return this.getMyAppointments(userId, this.availability.today(), undefined, false);
    }

    /** Agenda: citas programadas agrupadas por dia. */
    async getAgenda(userId: number, from: string, to: string): Promise<AgendaDay[]> {
        if (!isValidDate(from) || !isValidDate(to) || to < from) {
            throw new ApiError(400, "Rango de fechas invalido");
        }
        return this.groupByDay(await this.getMyAppointments(userId, from, to, false));
    }

    /** Agenda de un medico (solo admin): todas las citas programadas del rango. */
    async getDoctorAgenda(doctorId: number, from: string, to: string): Promise<AgendaDay[]> {
        if (!isValidDate(from) || !isValidDate(to) || to < from) {
            throw new ApiError(400, "Rango de fechas invalido");
        }
        const doctor = await this.doctorPort.getDoctorById(doctorId);
        if (!doctor) {
            throw new ApiError(404, "Medico no encontrado");
        }
        const appointments = await this.port.getAppointmentsByDoctor(doctorId, from, to, true);
        return this.groupByDay(await this.toDetail(appointments));
    }

    private groupByDay(appointments: AppointmentDetail[]): AgendaDay[] {
        const days = new Map<string, AppointmentDetail[]>();
        for (const a of appointments) {
            days.set(a.date, [...(days.get(a.date) ?? []), a]);
        }
        return [...days.entries()].map(([date, list]) => ({ date, appointments: list }));
    }
}
