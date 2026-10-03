/**
 * Utilidades de fecha y hora.
 * Las fechas viajan como texto "YYYY-MM-DD" y las horas como "HH:MM" para
 * evitar los problemas de zona horaria de los objetos Date.
 */

export const isValidDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split("-").map(Number) as [number, number, number];
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** 0 = domingo ... 6 = sabado */
export const dayOfWeek = (date: string): number => {
    const [y, m, d] = date.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const addDays = (date: string, days: number): string => {
    const [y, m, d] = date.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const toMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number) as [number, number];
    return h * 60 + m;
};

export const fromMinutes = (minutes: number): string => {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    return `${h}:${m}`;
};

/** Fecha y hora actuales en la zona horaria configurada. */
export const nowInZone = (timeZone: string): { date: string; minutes: number } => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
    return {
        date: `${get("year")}-${get("month")}-${get("day")}`,
        minutes: Number(get("hour")) * 60 + Number(get("minute")),
    };
};

const DAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10-05" -> "lunes 5 de octubre" (para mensajes legibles y para voz). */
export const describeDate = (date: string): string => {
    const [, m, d] = date.split("-").map(Number) as [number, number, number];
    return `${DAYS[dayOfWeek(date)]} ${d} de ${MONTHS[m - 1]}`;
};
