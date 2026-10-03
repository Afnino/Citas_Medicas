import { Doctor, DoctorSchedule } from "./Doctor.js";

export interface DoctorPort{

    createDoctor(doctor: Omit<Doctor, "id">): Promise <number>;
    getDoctorById(id:number):Promise<Doctor| null>;
    getAllDoctors(specialtyId?: number): Promise<Doctor[]>;

    addSchedule(schedule: Omit<DoctorSchedule, "id">): Promise<number>;
    getSchedulesByDoctor(doctorId: number, dayOfWeek?: number): Promise<DoctorSchedule[]>;

}
