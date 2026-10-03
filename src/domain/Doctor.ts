export interface Doctor{
    id: number;
    name: string;
    specialtyId: number;
    status: number;
}

/**
 * Bloque de atencion semanal de un medico.
 * dayOfWeek: 0 = domingo ... 6 = sabado. Las horas van en formato "HH:MM".
 */
export interface DoctorSchedule{
    id: number;
    doctorId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotMinutes: number;
}
