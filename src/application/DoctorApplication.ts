import { Doctor, DoctorSchedule } from "../domain/Doctor.js";
import { DoctorPort } from "../domain/DoctorPort.js";
import { SpecialtyPort } from "../domain/SpecialtyPort.js";
import { ApiError } from "../shared/ApiError.js";
import { toMinutes } from "../shared/dates.js";

/** Medico con el nombre de su especialidad (para respuestas legibles). */
export interface DoctorDetail extends Doctor {
    specialtyName: string;
}

export class DoctorApplication {
    private port: DoctorPort;
    private specialtyPort: SpecialtyPort;

    constructor(port: DoctorPort, specialtyPort: SpecialtyPort) {
        this.port = port;
        this.specialtyPort = specialtyPort;
    }

    private async toDetail(doctors: Doctor[]): Promise<DoctorDetail[]> {
        const specialties = await this.specialtyPort.getAllSpecialties();
        const names = new Map(specialties.map((s) => [s.id, s.name]));
        return doctors.map((d) => ({ ...d, specialtyName: names.get(d.specialtyId) ?? "Sin especialidad" }));
    }

    async createDoctor(doctor: Omit<Doctor, "id">): Promise<number> {
        const specialty = await this.specialtyPort.getSpecialtyById(doctor.specialtyId);
        if (!specialty) {
            throw new ApiError(404, "Especialidad no encontrada");
        }
        return this.port.createDoctor(doctor);
    }

    async getDoctorById(id: number): Promise<DoctorDetail | null> {
        const doctor = await this.port.getDoctorById(id);
        if (!doctor) return null;
        const [detail] = await this.toDetail([doctor]);
        return detail ?? null;
    }

    async getAllDoctors(specialtyId?: number): Promise<DoctorDetail[]> {
        const doctors = await this.port.getAllDoctors(specialtyId);
        return this.toDetail(doctors);
    }

    async addSchedule(schedule: Omit<DoctorSchedule, "id">): Promise<number> {
        const doctor = await this.port.getDoctorById(schedule.doctorId);
        if (!doctor) {
            throw new ApiError(404, "Medico no encontrado");
        }
        if (toMinutes(schedule.endTime) <= toMinutes(schedule.startTime)) {
            throw new ApiError(400, "La hora de fin debe ser posterior a la de inicio");
        }
        return this.port.addSchedule(schedule);
    }

    async getSchedulesByDoctor(doctorId: number): Promise<DoctorSchedule[]> {
        const doctor = await this.port.getDoctorById(doctorId);
        if (!doctor) {
            throw new ApiError(404, "Medico no encontrado");
        }
        return this.port.getSchedulesByDoctor(doctorId);
    }
}
