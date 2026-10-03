import { Appointment } from "./Appointment.js";

export interface AppointmentPort{

    createAppointment(appointment: Omit<Appointment, "id">): Promise <number>;
    getAppointmentById(id:number):Promise<Appointment| null>;
    /** Citas de un paciente (opcionalmente dentro de un rango de fechas, ambos incluidos). */
    getAppointmentsByUser(userId:number, from?: string, to?: string): Promise<Appointment[]>;
    /** Citas de un medico (agenda). Solo las programadas si onlyScheduled es true. */
    getAppointmentsByDoctor(doctorId:number, from: string, to: string, onlyScheduled?: boolean): Promise<Appointment[]>;
    cancelAppointment(id:number):Promise<boolean>;

}
