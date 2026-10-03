import { Repository } from "typeorm";
import { Doctor as DoctorDomain, DoctorSchedule as DoctorScheduleDomain } from "../../domain/Doctor.js";
import { DoctorPort } from "../../domain/DoctorPort.js";
import { AppDataSource } from "../config/data-base.js";
import { DoctorEntity } from "../entities/Doctor.js";
import { DoctorScheduleEntity } from "../entities/DoctorSchedule.js";
import { SpecialtyEntity } from "../entities/Specialty.js";

export class DoctorAdapter implements DoctorPort {

    private doctorRepository: Repository<DoctorEntity>
    private scheduleRepository: Repository<DoctorScheduleEntity>

    constructor() {
        this.doctorRepository = AppDataSource.getRepository(DoctorEntity);
        this.scheduleRepository = AppDataSource.getRepository(DoctorScheduleEntity);
    }
    //Transformar la entidad de infraestructura al modelo de dominio
    private toDomain(doctor: DoctorEntity): DoctorDomain {
        return {
            id: doctor.id,
            name: doctor.name,
            specialtyId: doctor.specialty_id,
            status: doctor.status
        };
    }
    // La columna "time" de PostgreSQL llega como "HH:MM:SS"; el dominio usa "HH:MM".
    private scheduleToDomain(schedule: DoctorScheduleEntity): DoctorScheduleDomain {
        return {
            id: schedule.id,
            doctorId: schedule.doctor_id,
            dayOfWeek: schedule.day_of_week,
            startTime: schedule.start_time.slice(0, 5),
            endTime: schedule.end_time.slice(0, 5),
            slotMinutes: schedule.slot_minutes
        };
    }

    // Sembrar medicos y horarios iniciales una sola vez (si la tabla esta vacia).
    // Debe llamarse DESPUES de SpecialtyAdapter.seedIfEmpty().
    async seedIfEmpty(): Promise<void> {
        const count = await this.doctorRepository.count();
        if (count > 0) return;

        const specialties = await AppDataSource.getRepository(SpecialtyEntity).find();
        const idOf = (name: string): number => {
            const found = specialties.find((s) => s.name === name);
            if (!found) throw new Error(`Falta la especialidad ${name} para sembrar medicos`);
            return found.id;
        };

        const seed = [
            { name: "Dra. Laura Gomez", specialty: "Medicina general", days: [1, 2, 3, 4, 5], start: "08:00", end: "12:00" },
            { name: "Dr. Carlos Ramirez", specialty: "Medicina general", days: [1, 3, 5], start: "14:00", end: "18:00" },
            { name: "Dra. Marta Rojas", specialty: "Dermatologia", days: [1, 2, 4], start: "09:00", end: "13:00" },
            { name: "Dr. Andres Pineda", specialty: "Dermatologia", days: [3, 5], start: "14:00", end: "17:00" },
            { name: "Dra. Sofia Herrera", specialty: "Pediatria", days: [1, 2, 3, 4, 5], start: "08:00", end: "11:00" },
            { name: "Dr. Julian Castro", specialty: "Cardiologia", days: [2, 4], start: "10:00", end: "14:00" },
            { name: "Dra. Elena Vargas", specialty: "Ginecologia", days: [1, 3, 5], start: "09:00", end: "12:00" },
        ];

        for (const item of seed) {
            const doctor = await this.doctorRepository.save({ name: item.name, specialty_id: idOf(item.specialty), status: 1 });
            const schedules = item.days.map((day) => ({
                doctor_id: doctor.id,
                day_of_week: day,
                start_time: item.start,
                end_time: item.end,
                slot_minutes: 30,
            }));
            await this.scheduleRepository.save(schedules);
        }
    }

    async createDoctor(doctor: Omit<DoctorDomain, "id">): Promise<number> {
        try {
            const saved = await this.doctorRepository.save({
                name: doctor.name,
                specialty_id: doctor.specialtyId,
                status: doctor.status
            });
            return saved.id;
        } catch (error) {
            console.error("Error creando medico:", error)
            throw new Error("Error al crear medico");
        }
    }
    async getDoctorById(id: number): Promise<DoctorDomain | null> {
        try {
            const doctor = await this.doctorRepository.findOne({ where: { id } });
            return doctor ? this.toDomain(doctor) : null;
        } catch (error) {
            console.error("Error obteniendo medico por ID:", error)
            throw new Error("Error obteniendo medico");
        }
    }
    async getAllDoctors(specialtyId?: number): Promise<DoctorDomain[]> {
        try {
            const where = specialtyId !== undefined
                ? { status: 1, specialty_id: specialtyId }
                : { status: 1 };
            const doctors = await this.doctorRepository.find({ where, order: { name: "ASC" } });
            return doctors.map((d) => this.toDomain(d));
        } catch (error) {
            console.error("Error obteniendo medicos", error)
            throw new Error("Error obteniendo lista de medicos");
        }
    }

    async addSchedule(schedule: Omit<DoctorScheduleDomain, "id">): Promise<number> {
        try {
            const saved = await this.scheduleRepository.save({
                doctor_id: schedule.doctorId,
                day_of_week: schedule.dayOfWeek,
                start_time: schedule.startTime,
                end_time: schedule.endTime,
                slot_minutes: schedule.slotMinutes
            });
            return saved.id;
        } catch (error) {
            console.error("Error creando horario:", error)
            throw new Error("Error al crear horario");
        }
    }
    async getSchedulesByDoctor(doctorId: number, dayOfWeek?: number): Promise<DoctorScheduleDomain[]> {
        try {
            const where = dayOfWeek !== undefined
                ? { doctor_id: doctorId, day_of_week: dayOfWeek }
                : { doctor_id: doctorId };
            const schedules = await this.scheduleRepository.find({ where, order: { day_of_week: "ASC", start_time: "ASC" } });
            return schedules.map((s) => this.scheduleToDomain(s));
        } catch (error) {
            console.error("Error obteniendo horarios", error)
            throw new Error("Error obteniendo horarios del medico");
        }
    }

}
