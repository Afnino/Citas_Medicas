import { AssistantContext, AssistantIntent, AssistantReply } from "../domain/Assistant.js";
import { AssistantPort } from "../domain/AssistantPort.js";
import { Slot } from "../domain/Appointment.js";
import { Doctor } from "../domain/Doctor.js";
import { Specialty } from "../domain/Specialty.js";
import { ApiError } from "../shared/ApiError.js";
import { describeDate } from "../shared/dates.js";
import { AppointmentApplication } from "./AppointmentApplication.js";
import { AvailabilityApplication } from "./AvailabilityApplication.js";
import { DoctorApplication } from "./DoctorApplication.js";
import { SpecialtyApplication } from "./SpecialtyApplication.js";

const SEARCH_DAYS = 14;
const MAX_OPTIONS = 5;

const normalize = (text: string): string =>
    text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Caso de uso del asistente de voz/IA.
 * El AssistantPort solo INTERPRETA la frase; aqui se EJECUTA usando los mismos
 * casos de uso que las rutas REST (disponibilidad, citas...). Asi el asistente
 * no tiene reglas de negocio propias ni conoce al proveedor de IA.
 *
 * Las acciones que cambian datos (agendar, cancelar) siempre piden confirmacion.
 */
export class AssistantApplication {
    private port: AssistantPort;
    private specialtyApp: SpecialtyApplication;
    private doctorApp: DoctorApplication;
    private availability: AvailabilityApplication;
    private appointmentApp: AppointmentApplication;

    constructor(
        port: AssistantPort,
        specialtyApp: SpecialtyApplication,
        doctorApp: DoctorApplication,
        availability: AvailabilityApplication,
        appointmentApp: AppointmentApplication
    ) {
        this.port = port;
        this.specialtyApp = specialtyApp;
        this.doctorApp = doctorApp;
        this.availability = availability;
        this.appointmentApp = appointmentApp;
    }

    async handle(userId: number, role: string, message: string, context: AssistantContext = {}): Promise<AssistantReply> {
        const [specialties, doctors] = await Promise.all([
            this.specialtyApp.getAllSpecialties(),
            this.doctorApp.getAllDoctors(),
        ]);
        const today = this.availability.today();

        // 1) Interpretar (infraestructura: reglas locales o IA)
        const interpretation = await this.port.interpret(
            message,
            {
                today,
                specialties: specialties.map((s) => s.name),
                doctors: doctors.map((d) => ({ name: d.name, specialty: d.specialtyName })),
            },
            context
        );

        // 2) Ejecutar (aplicacion)
        const intent = interpretation.intent;
        try {
            if (context.awaiting === "confirm" && (intent === "confirm" || intent === "deny")) {
                return intent === "confirm"
                    ? await this.executePending(userId, role, context)
                    : this.reply("Entendido, no hice ningun cambio.", "deny", {});
            }

            if (context.awaiting === "option" && intent === "select_option") {
                return await this.chooseOption(userId, context, interpretation.optionIndex);
            }

            // Datos de turnos anteriores solo se reutilizan si seguimos en el mismo tema.
            const carry = context.intent === intent ? context : {};
            const specialty = this.findSpecialty(specialties, interpretation.specialty ?? carry.specialty);
            const doctor = this.findDoctor(doctors, interpretation.doctor ?? carry.doctor);
            const date = interpretation.date ?? carry.date;
            const time = interpretation.time ?? carry.time;

            switch (intent) {
                case "list_specialties":
                    return this.reply(
                        `Estas son las especialidades: ${specialties.map((s) => s.name).join(", ")}.`,
                        intent, {}
                    );

                case "list_doctors": {
                    const list = specialty ? doctors.filter((d) => d.specialtyId === specialty.id) : doctors;
                    if (list.length === 0) return this.reply("No encontre medicos para esa consulta.", intent, {});
                    const names = list.map((d) => `${d.name} (${d.specialtyName})`).join(", ");
                    return this.reply(`Estos son los medicos: ${names}.`, intent, {});
                }

                case "check_availability":
                case "book_appointment":
                    return await this.searchSlots(userId, intent, { specialty, doctor, date, time }, today);

                case "my_appointments": {
                    const upcoming = await this.appointmentApp.getUpcomingAppointments(userId);
                    if (upcoming.length === 0) return this.reply("No tienes citas programadas.", intent, {});
                    const lines = upcoming.map((a, i) => `${i + 1}. ${a.doctorName}, ${describeDate(a.date)} a las ${a.time}`);
                    return this.reply(`Tienes ${upcoming.length} cita(s) programada(s).`, intent, {}, lines);
                }

                case "cancel_appointment":
                    return await this.startCancel(userId, role, interpretation.appointmentId);

                case "help":
                    return this.reply(this.helpText(), intent, {});

                default:
                    return this.reply(`No entendi tu solicitud. ${this.helpText()}`, "unknown", {});
            }
        } catch (error) {
            // El asistente "habla" los errores de negocio en lugar de fallar.
            if (error instanceof ApiError && error.statusCode < 500) {
                return this.reply(`${error.message}.`, intent, {});
            }
            throw error;
        }
    }

    // ---------- Busqueda de horarios (consultar disponibilidad / iniciar una cita) ----------

    private async searchSlots(
        userId: number,
        intent: AssistantIntent,
        q: { specialty: Specialty | undefined; doctor: Doctor | undefined; date: string | undefined; time: string | undefined },
        today: string
    ): Promise<AssistantReply> {
        const base: AssistantContext = {
            intent,
            ...(q.specialty ? { specialty: q.specialty.name } : {}),
            ...(q.doctor ? { doctor: q.doctor.name } : {}),
            ...(q.date ? { date: q.date } : {}),
            ...(q.time ? { time: q.time } : {}),
        };

        // Medico + fecha + hora ya definidos: se pasa directo a confirmar.
        if (q.doctor && q.date && q.time) {
            const slots = await this.availability.getSlots(q.doctor.id, q.date);
            if (slots.some((s) => s.time === q.time)) {
                return this.askConfirmBook(q.doctor.name, q.doctor.id, q.date, q.time);
            }
            return this.proposeSlots(
                { doctorId: q.doctor.id, fromDate: q.date, days: 1 },
                `${q.doctor.name} no tiene libre el ${describeDate(q.date)} a las ${q.time}.`,
                base
            );
        }

        // Sin medico ni especialidad: para agendar preguntamos; para consultar, listamos medicos libres.
        if (!q.doctor && !q.specialty) {
            if (intent === "check_availability" && q.date) {
                const available = await this.availability.getAvailableDoctors(q.date);
                if (available.length === 0) {
                    return this.reply(`No hay medicos con disponibilidad el ${describeDate(q.date)}.`, intent, base);
                }
                const lines = available.map((a) => `${a.doctor.name}: ${a.slots.length} horarios, desde las ${a.slots[0]!.time}`);
                return this.reply(`Medicos con disponibilidad el ${describeDate(q.date)}:`, intent, base, lines);
            }
            return this.reply("Con que especialidad o medico quieres la cita? Por ejemplo: dermatologia.", intent, base);
        }

        return this.proposeSlots(
            {
                ...(q.doctor ? { doctorId: q.doctor.id } : {}),
                ...(q.specialty ? { specialtyId: q.specialty.id } : {}),
                fromDate: q.date ?? today,
                days: q.date ? 1 : SEARCH_DAYS,
                ...(q.time ? { time: q.time } : {}),
            },
            "",
            { ...base, intent: "book_appointment" }
        );
    }

    private async proposeSlots(
        search: { doctorId?: number; specialtyId?: number; fromDate: string; days: number; time?: string },
        prefix: string,
        base: AssistantContext
    ): Promise<AssistantReply> {
        const slots = await this.availability.findNextSlots({ ...search, limit: MAX_OPTIONS });
        if (slots.length === 0) {
            return this.reply(`${prefix} No encontre horarios disponibles en ese periodo.`.trim(), "check_availability", base);
        }
        const names = await this.doctorNames();
        const lines = slots.map((s: Slot, i) => `${i + 1}. ${names.get(s.doctorId)}, ${describeDate(s.date)} a las ${s.time}`);
        return this.reply(
            `${prefix} Estos son los horarios disponibles. Dime el numero de la opcion que prefieres.`.trim(),
            "book_appointment",
            {
                ...base,
                awaiting: "option",
                intent: "book_appointment",
                options: slots.map((s) => ({ doctorId: s.doctorId, date: s.date, time: s.time })),
            },
            lines
        );
    }

    // ---------- Elegir una opcion y confirmar ----------

    private async chooseOption(userId: number, context: AssistantContext, optionIndex: number | undefined): Promise<AssistantReply> {
        const options = context.options ?? [];
        const option = optionIndex !== undefined ? options[optionIndex - 1] : undefined;
        if (!option) {
            return this.reply(`Elige un numero entre 1 y ${options.length}.`, "select_option", context);
        }

        if (context.intent === "cancel_appointment" && option.appointmentId !== undefined) {
            return this.askConfirmCancel(userId, option.appointmentId);
        }
        if (option.doctorId !== undefined && option.date && option.time) {
            const names = await this.doctorNames();
            return this.askConfirmBook(names.get(option.doctorId) ?? "el medico", option.doctorId, option.date, option.time);
        }
        return this.reply("No pude usar esa opcion. Intentemos de nuevo.", "select_option", {});
    }

    private askConfirmBook(doctorName: string, doctorId: number, date: string, time: string): AssistantReply {
        return this.reply(
            `Voy a agendar una cita con ${doctorName} el ${describeDate(date)} a las ${time}. Confirmas? Responde si o no.`,
            "book_appointment",
            { awaiting: "confirm", intent: "book_appointment", pending: { type: "book", doctorId, date, time } }
        );
    }

    private async startCancel(userId: number, role: string, appointmentId: number | undefined): Promise<AssistantReply> {
        if (appointmentId !== undefined) {
            return this.askConfirmCancel(userId, appointmentId, role);
        }
        const upcoming = await this.appointmentApp.getUpcomingAppointments(userId);
        if (upcoming.length === 0) return this.reply("No tienes citas programadas para cancelar.", "cancel_appointment", {});
        if (upcoming.length === 1) return this.askConfirmCancel(userId, upcoming[0]!.id);

        const lines = upcoming.map((a, i) => `${i + 1}. ${a.doctorName}, ${describeDate(a.date)} a las ${a.time}`);
        return this.reply(
            "Tienes varias citas. Dime el numero de la que quieres cancelar.",
            "cancel_appointment",
            { awaiting: "option", intent: "cancel_appointment", options: upcoming.map((a) => ({ appointmentId: a.id })) },
            lines
        );
    }

    private async askConfirmCancel(userId: number, appointmentId: number, role: string = "user"): Promise<AssistantReply> {
        const a = await this.appointmentApp.getAppointmentById(userId, role, appointmentId);
        if (a.status === "cancelled") throw new ApiError(409, "Esa cita ya estaba cancelada");
        return this.reply(
            `Voy a cancelar tu cita con ${a.doctorName} el ${describeDate(a.date)} a las ${a.time}. Confirmas? Responde si o no.`,
            "cancel_appointment",
            { awaiting: "confirm", intent: "cancel_appointment", pending: { type: "cancel", appointmentId } }
        );
    }

    // El contexto lo envia el cliente, asi que aqui se vuelve a validar todo:
    // disponibilidad (en bookAppointment) y pertenencia de la cita (en cancelAppointment).
    private async executePending(userId: number, role: string, context: AssistantContext): Promise<AssistantReply> {
        const pending = context.pending;
        if (pending?.type === "book" && pending.doctorId !== undefined && pending.date && pending.time) {
            const id = await this.appointmentApp.bookAppointment(userId, pending.doctorId, pending.date, pending.time, "Agendada con el asistente");
            return this.reply(`Listo, tu cita quedo agendada para el ${describeDate(pending.date)} a las ${pending.time}. Numero de cita: ${id}.`, "confirm", {});
        }
        if (pending?.type === "cancel" && pending.appointmentId !== undefined) {
            await this.appointmentApp.cancelAppointment(userId, role, pending.appointmentId);
            return this.reply("Listo, tu cita fue cancelada.", "confirm", {});
        }
        return this.reply("No tengo nada pendiente por confirmar.", "confirm", {});
    }

    // ---------- Utilidades ----------

    private findSpecialty(specialties: Specialty[], name?: string): Specialty | undefined {
        if (!name) return undefined;
        const n = normalize(name);
        return specialties.find((s) => normalize(s.name) === n) ?? specialties.find((s) => normalize(s.name).includes(n));
    }

    private findDoctor(doctors: Doctor[], name?: string): Doctor | undefined {
        if (!name) return undefined;
        const n = normalize(name);
        return doctors.find((d) => normalize(d.name) === n) ?? doctors.find((d) => normalize(d.name).includes(n));
    }

    private async doctorNames(): Promise<Map<number, string>> {
        const doctors = await this.doctorApp.getAllDoctors();
        return new Map(doctors.map((d) => [d.id, d.name]));
    }

    private helpText(): string {
        return "Puedo consultar especialidades, medicos y horarios disponibles, agendar o cancelar una cita y decirte cuales son tus citas. Por ejemplo: quiero una cita con dermatologia.";
    }

    private reply(text: string, intent: AssistantIntent, context: AssistantContext, options?: string[]): AssistantReply {
        // La voz lee el texto y luego las opciones, una por una.
        const speech = options ? `${text} ${options.join(". ")}` : text;
        return { reply: text, speech, intent, context, ...(options ? { options } : {}) };
    }
}
