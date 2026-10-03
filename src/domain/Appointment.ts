export type AppointmentStatus = "scheduled" | "cancelled";

export interface Appointment{
    id: number;
    userId: number;
    doctorId: number;
    date: string;   // "YYYY-MM-DD"
    time: string;   // "HH:MM"
    reason: string;
    status: AppointmentStatus;
}

/** Cita enriquecida con nombres legibles (la arma la capa de aplicacion). */
export interface AppointmentDetail extends Appointment{
    doctorName: string;
    specialtyName: string;
}

/** Horario libre de un medico en una fecha. */
export interface Slot{
    doctorId: number;
    date: string;
    time: string;
}
