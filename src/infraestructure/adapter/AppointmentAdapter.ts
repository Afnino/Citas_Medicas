import { Between, Repository } from "typeorm";
import { Appointment as AppointmentDomain, AppointmentStatus } from "../../domain/Appointment.js";
import { AppointmentPort } from "../../domain/AppointmentPort.js";
import { ApiError } from "../../shared/ApiError.js";
import { AppDataSource } from "../config/data-base.js";
import { AppointmentEntity } from "../entities/Appointment.js";

const FAR_PAST = "0001-01-01";
const FAR_FUTURE = "9999-12-31";

export class AppointmentAdapter implements AppointmentPort {

    private appointmentRepository: Repository<AppointmentEntity>

    constructor() {
        this.appointmentRepository = AppDataSource.getRepository(AppointmentEntity);
    }
    //Transformar la entidad de infraestructura al modelo de dominio
    private toDomain(appointment: AppointmentEntity): AppointmentDomain {
        return {
            id: appointment.id,
            userId: appointment.user_id,
            doctorId: appointment.doctor_id,
            date: appointment.appointment_date,
            time: appointment.appointment_time.slice(0, 5),
            reason: appointment.reason,
            status: appointment.status as AppointmentStatus
        };
    }

    async createAppointment(appointment: Omit<AppointmentDomain, "id">): Promise<number> {
        try {
            const saved = await this.appointmentRepository.save({
                user_id: appointment.userId,
                doctor_id: appointment.doctorId,
                appointment_date: appointment.date,
                appointment_time: appointment.time,
                reason: appointment.reason,
                status: appointment.status
            });
            return saved.id;
        } catch (error: any) {
            // 23505 = unique_violation: otra persona tomo el horario justo antes.
            if (error?.code === "23505") {
                throw new ApiError(409, "Ese horario ya no esta disponible");
            }
            console.error("Error creando cita:", error)
            throw new Error("Error al crear cita");
        }
    }
    async getAppointmentById(id: number): Promise<AppointmentDomain | null> {
        try {
            const appointment = await this.appointmentRepository.findOne({ where: { id } });
            return appointment ? this.toDomain(appointment) : null;
        } catch (error) {
            console.error("Error obteniendo cita por ID:", error)
            throw new Error("Error obteniendo cita");
        }
    }
    async getAppointmentsByUser(userId: number, from?: string, to?: string): Promise<AppointmentDomain[]> {
        try {
            const appointments = await this.appointmentRepository.find({
                where: { user_id: userId, appointment_date: Between(from ?? FAR_PAST, to ?? FAR_FUTURE) },
                order: { appointment_date: "ASC", appointment_time: "ASC" }
            });
            return appointments.map((a) => this.toDomain(a));
        } catch (error) {
            console.error("Error obteniendo citas del usuario", error)
            throw new Error("Error obteniendo citas");
        }
    }
    async getAppointmentsByDoctor(doctorId: number, from: string, to: string, onlyScheduled: boolean = false): Promise<AppointmentDomain[]> {
        try {
            const where = onlyScheduled
                ? { doctor_id: doctorId, appointment_date: Between(from, to), status: "scheduled" }
                : { doctor_id: doctorId, appointment_date: Between(from, to) };
            const appointments = await this.appointmentRepository.find({
                where,
                order: { appointment_date: "ASC", appointment_time: "ASC" }
            });
            return appointments.map((a) => this.toDomain(a));
        } catch (error) {
            console.error("Error obteniendo citas del medico", error)
            throw new Error("Error obteniendo agenda del medico");
        }
    }
    async cancelAppointment(id: number): Promise<boolean> {
        try {
            const existing = await this.appointmentRepository.findOne({ where: { id } });
            if (!existing) return false;
            //Cancelar = cambiar el estado (no se borra el historial)
            existing.status = "cancelled";
            await this.appointmentRepository.save(existing);
            return true;
        } catch (error) {
            console.error("Error cancelando cita:", error)
            throw new Error("Error al cancelar cita");
        }
    }

}
