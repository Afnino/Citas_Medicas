import { AssistantCatalog, AssistantContext, AssistantInterpretation, AssistantIntent } from "../../domain/Assistant.js";
import { AssistantPort } from "../../domain/AssistantPort.js";
import { addDays, dayOfWeek } from "../../shared/dates.js";

const normalize = (text: string): string =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!,.;]/g, " ").replace(/\s+/g, " ").trim();

const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const ORDINALS: [RegExp, number][] = [
    [/\b(primera|primero|uno)\b/, 1],
    [/\b(segunda|segundo|dos)\b/, 2],
    [/\b(tercera|tercero|tres)\b/, 3],
    [/\b(cuarta|cuarto|cuatro)\b/, 4],
    [/\b(quinta|quinto|cinco)\b/, 5],
];
// Palabras que no sirven para reconocer una especialidad o un medico.
const GENERIC = new Set(["medicina", "medico", "doctor", "doctora", "dr", "dra", "cita"]);

/**
 * Adaptador del asistente que interpreta el espanol con reglas locales.
 * No necesita claves ni red: es la implementacion por defecto del AssistantPort.
 */
export class RulesAssistantAdapter implements AssistantPort {

    async interpret(message: string, catalog: AssistantCatalog, context?: AssistantContext): Promise<AssistantInterpretation> {
        const text = normalize(message);
        const result: AssistantInterpretation = { intent: "unknown" };

        const specialty = this.findSpecialty(text, catalog);
        const doctor = this.findDoctor(text, catalog);
        const date = this.findDate(text, catalog.today);
        const time = this.findTime(text);
        if (specialty) result.specialty = specialty;
        if (doctor) result.doctor = doctor;
        if (date) result.date = date;
        if (time) result.time = time;

        const appointmentId = /\bcita (?:numero |no |n |#)?(\d+)\b/.exec(text)?.[1];
        if (appointmentId) result.appointmentId = Number(appointmentId);

        result.intent = this.findIntent(text, context, Boolean(specialty || doctor || date || time));

        if (result.intent === "select_option") {
            const index = this.findOptionIndex(text);
            if (index !== undefined) result.optionIndex = index;
        }
        return result;
    }

    private findIntent(text: string, context: AssistantContext | undefined, hasEntities: boolean): AssistantIntent {
        const words = text.split(" ").length;
        const awaiting = context?.awaiting;

        if (awaiting === "confirm" && words <= 5) {
            if (/\b(si|sip|claro|confirmo|confirmar|dale|ok|okay|listo|de acuerdo|correcto)\b/.test(text)) return "confirm";
            if (/\b(no|nop|mejor no|cancela eso|negativo)\b/.test(text)) return "deny";
        }
        if (awaiting === "option" && this.findOptionIndex(text) !== undefined && words <= 6) return "select_option";

        if (/\b(cancel\w*|anul\w*|eliminar)\b/.test(text)) return "cancel_appointment";
        if (/\bmis citas\b|\bmi proxima cita\b|\bque citas\b|\bcuando es mi cita\b|\bcitas (agendadas|programadas)\b|\btengo (alguna )?citas?\b|\bmi agenda\b|\bver mi agenda\b/.test(text)) return "my_appointments";
        if (/\bdisponib\w*|\bhorarios?\b|\bcupos?\b|\bhay (espacio|libre)\w*|\blibres?\b/.test(text)) return "check_availability";
        if (/\b(cita|consulta|turno|agendar|reservar|programar|solicitar)\b/.test(text)) return "book_appointment";
        if (/\bespecialidades\b/.test(text)) return "list_specialties";
        if (/\b(medicos|doctores|doctoras|medicas)\b/.test(text)) return "list_doctors";
        if (/\b(ayuda|que puedes hacer|que haces|hola|buenas)\b/.test(text)) return "help";

        // Respuesta corta a una pregunta del asistente ("dermatologia", "manana a las 10")
        if (hasEntities && (context?.intent === "book_appointment" || context?.intent === "check_availability")) {
            return context.intent;
        }
        return "unknown";
    }

    private findOptionIndex(text: string): number | undefined {
        const numeric = /\b(?:opcion |la |numero |el )?([1-5])\b/.exec(text)?.[1];
        if (numeric) return Number(numeric);
        return ORDINALS.find(([regex]) => regex.test(text))?.[1];
    }

    // Coincide con el nombre completo o con una raiz de cada palabra
    // (dermatologia / dermatologo comparten "dermatol").
    private findSpecialty(text: string, catalog: AssistantCatalog): string | undefined {
        for (const name of catalog.specialties) {
            const normalized = normalize(name);
            if (text.includes(normalized)) return name;
            const stems = normalized.split(" ")
                .filter((w) => w.length >= 6 && !GENERIC.has(w))
                .map((w) => w.slice(0, Math.max(5, w.length - 3)));
            if (stems.some((stem) => text.includes(stem))) return name;
        }
        return undefined;
    }

    private findDoctor(text: string, catalog: AssistantCatalog): string | undefined {
        for (const doctor of catalog.doctors) {
            const tokens = normalize(doctor.name).split(" ").filter((w) => w.length >= 4 && !GENERIC.has(w));
            if (tokens.some((token) => new RegExp(`\\b${token}\\b`).test(text))) return doctor.name;
        }
        return undefined;
    }

    private findDate(text: string, today: string): string | undefined {
        const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text)?.[1];
        if (iso) return iso;

        if (/\bpasado manana\b/.test(text)) return addDays(today, 2);
        // "por la manana" es parte del dia, no la fecha de manana.
        if (/(?<!\bla )\bmanana\b/.test(text)) return addDays(today, 1);
        if (/\bhoy\b/.test(text)) return today;

        const dm = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/.exec(text);
        if (dm) {
            const year = dm[3] ?? today.slice(0, 4);
            return `${year}-${dm[2]!.padStart(2, "0")}-${dm[1]!.padStart(2, "0")}`;
        }

        for (let i = 0; i < WEEKDAYS.length; i++) {
            if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(text)) {
                // Proximo dia con ese nombre (si hoy es ese dia, el de la proxima semana).
                const diff = ((i - dayOfWeek(today) + 7) % 7) || 7;
                return addDays(today, diff);
            }
        }
        return undefined;
    }

    private findTime(text: string): string | undefined {
        const m = /\b(?:a las |las )?(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la manana|de la tarde|de la noche)?\b/.exec(
            text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "").replace(/\b\d{1,2}\/\d{1,2}(\/\d{4})?\b/g, "")
        );
        // Un numero suelto (ej. "la 2") no es una hora: exigimos "a las", minutos, am/pm o franja del dia.
        const hasMarker = /\ba las \d|\blas \d{1,2}:\d{2}|\d:\d{2}|\d\s*(am|pm|de la)/.test(text);
        if (!m || !hasMarker) return undefined;

        let hour = Number(m[1]);
        const minutes = m[2] ?? "00";
        const period = m[3];
        if (period === "pm" || period === "de la tarde" || period === "de la noche") {
            if (hour < 12) hour += 12;
        } else if (period === "am" || period === "de la manana") {
            if (hour === 12) hour = 0;
        } else if (hour >= 1 && hour <= 6) {
            hour += 12; // "a las 3" en consulta medica es la tarde
        }
        if (hour > 23) return undefined;
        return `${String(hour).padStart(2, "0")}:${minutes}`;
    }
}
