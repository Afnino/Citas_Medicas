import { Slot } from "../domain/Appointment.js";
import { AppointmentPort } from "../domain/AppointmentPort.js";
import { Doctor } from "../domain/Doctor.js";
import { DoctorPort } from "../domain/DoctorPort.js";
import { ApiError } from "../shared/ApiError.js";
import { addDays, dayOfWeek, fromMinutes, isValidDate, nowInZone, toMinutes } from "../shared/dates.js";
import envs from "../infraestructure/config/environment-vars.js";

export interface DoctorAvailability {
    doctor: Doctor;
    slots: Slot[];
}

export class AvailabilityApplication {
    private doctorPort: DoctorPort;
    private appointmentPort: AppointmentPort;

    constructor(doctorPort: DoctorPort, appointmentPort: AppointmentPort) {
        this.doctorPort = doctorPort;
        this.appointmentPort = appointmentPort;
    }

    /** Fecha de hoy en la zona horaria configurada. */
    today(): string {
        return nowInZone(envs.TIMEZONE).date;
    }

    /**
     * Horarios libres de un medico en una fecha:
     * horario semanal del dia  -  citas programadas  -  horas que ya pasaron.
     */
    async getSlots(doctorId: number, date: string): Promise<Slot[]> {
        if (!isValidDate(date)) {
            throw new ApiError(400, "Fecha invalida (usa YYYY-MM-DD)");
        }
        const doctor = await this.doctorPort.getDoctorById(doctorId);
        if (!doctor || doctor.status !== 1) {
            throw new ApiError(404, "Medico no encontrado");
        }
        return this.slotsForDoctor(doctor, date);
    }

    private async slotsForDoctor(doctor: Doctor, date: string): Promise<Slot[]> {
        const now = nowInZone(envs.TIMEZONE);
        if (date < now.date) return [];

        // Las dos consultas son independientes: se lanzan juntas y se espera a ambas.
        const [schedules, booked] = await Promise.all([
            this.doctorPort.getSchedulesByDoctor(doctor.id, dayOfWeek(date)),
            this.appointmentPort.getAppointmentsByDoctor(doctor.id, date, date, true),
        ]);
        const taken = new Set(booked.map((a) => a.time));

        const slots: Slot[] = [];
        for (const schedule of schedules) {
            const end = toMinutes(schedule.endTime);
            for (let start = toMinutes(schedule.startTime); start + schedule.slotMinutes <= end; start += schedule.slotMinutes) {
                const time = fromMinutes(start);
                if (taken.has(time)) continue;
                if (date === now.date && start <= now.minutes) continue;
                slots.push({ doctorId: doctor.id, date, time });
            }
        }
        return slots.sort((a, b) => a.time.localeCompare(b.time));
    }

    /** Medicos (opcionalmente de una especialidad) con sus horarios libres en una fecha. */
    async getAvailableDoctors(date: string, specialtyId?: number): Promise<DoctorAvailability[]> {
        if (!isValidDate(date)) {
            throw new ApiError(400, "Fecha invalida (usa YYYY-MM-DD)");
        }
        const doctors = await this.doctorPort.getAllDoctors(specialtyId);
        // Una consulta por medico, todas en paralelo.
        const result = await Promise.all(
            doctors.map(async (doctor) => ({ doctor, slots: await this.slotsForDoctor(doctor, date) }))
        );
        return result.filter((r) => r.slots.length > 0);
    }

    /**
     * Proximos horarios libres a partir de una fecha (lo usa el asistente para
     * proponer opciones). Ordenados por fecha y hora.
     */
    async findNextSlots(options: {
        doctorId?: number;
        specialtyId?: number;
        fromDate: string;
        days: number;
        time?: string;
        limit: number;
    }): Promise<Slot[]> {
        const doctors = options.doctorId !== undefined
            ? [await this.doctorPort.getDoctorById(options.doctorId)].filter((d): d is Doctor => d !== null)
            : await this.doctorPort.getAllDoctors(options.specialtyId);

        const dates = Array.from({ length: options.days }, (_, i) => addDays(options.fromDate, i));
        // Todas las combinaciones medico x dia se consultan en paralelo.
        const lists = await Promise.all(
            doctors.flatMap((doctor) => dates.map((date) => this.slotsForDoctor(doctor, date)))
        );
        let slots = lists.flat();
        if (options.time) slots = slots.filter((s) => s.time === options.time);
        slots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        return slots.slice(0, options.limit);
    }
}
