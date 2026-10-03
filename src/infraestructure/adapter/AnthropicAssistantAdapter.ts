import { AssistantCatalog, AssistantContext, AssistantInterpretation } from "../../domain/Assistant.js";
import { AssistantPort } from "../../domain/AssistantPort.js";
import envs from "../config/environment-vars.js";

/**
 * Adaptador del asistente que interpreta con un modelo de IA (API de Anthropic).
 * Usa fetch (incluido en Node) para no agregar librerias.
 * Si la IA falla o responde algo inesperado, delega en el adaptador de respaldo
 * para que el asistente nunca deje de responder.
 */
export class AnthropicAssistantAdapter implements AssistantPort {
    private fallback: AssistantPort;

    constructor(fallback: AssistantPort) {
        this.fallback = fallback;
    }

    async interpret(message: string, catalog: AssistantCatalog, context?: AssistantContext): Promise<AssistantInterpretation> {
        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": envs.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: envs.ANTHROPIC_MODEL,
                    max_tokens: 300,
                    system: this.systemPrompt(catalog, context),
                    messages: [{ role: "user", content: message }],
                }),
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data: any = await response.json();
            const text: string = data?.content?.[0]?.text ?? "";
            const json = /\{[\s\S]*\}/.exec(text)?.[0];
            if (!json) throw new Error("La IA no devolvio JSON");
            return this.sanitize(JSON.parse(json));
        } catch (error) {
            console.error("Fallo el asistente de IA, usando interprete local:", error);
            return this.fallback.interpret(message, catalog, context);
        }
    }

    private systemPrompt(catalog: AssistantCatalog, context?: AssistantContext): string {
        return [
            "Eres el interprete de un asistente de citas medicas. NO respondes a la persona: solo clasificas su frase.",
            'Devuelve UNICAMENTE un JSON con esta forma: {"intent": "...", "specialty": "...", "doctor": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "appointmentId": 0, "optionIndex": 0}',
            "intent debe ser uno de: help, list_specialties, list_doctors, check_availability, book_appointment, cancel_appointment, my_appointments, select_option, confirm, deny, unknown.",
            "Incluye solo los campos que la persona menciono. specialty y doctor deben ser EXACTAMENTE un nombre del catalogo.",
            `Fecha de hoy: ${catalog.today}. Resuelve "manana", "el lunes", etc. a una fecha YYYY-MM-DD.`,
            `Especialidades: ${catalog.specialties.join(", ")}.`,
            `Medicos: ${catalog.doctors.map((d) => `${d.name} (${d.specialty})`).join(", ")}.`,
            context?.awaiting === "confirm" ? "El asistente espera un si/no: usa confirm o deny." : "",
            context?.awaiting === "option" ? "El asistente espera que elija una opcion numerada: usa select_option con optionIndex." : "",
            context?.intent ? `Tema anterior de la conversacion: ${context.intent}.` : "",
        ].filter(Boolean).join("\n");
    }

    // Nunca se confia ciegamente en la salida del modelo: se valida cada campo.
    private sanitize(raw: any): AssistantInterpretation {
        const intents = ["help", "list_specialties", "list_doctors", "check_availability", "book_appointment", "cancel_appointment", "my_appointments", "select_option", "confirm", "deny", "unknown"];
        const result: AssistantInterpretation = { intent: intents.includes(raw?.intent) ? raw.intent : "unknown" };
        if (typeof raw?.specialty === "string" && raw.specialty) result.specialty = raw.specialty;
        if (typeof raw?.doctor === "string" && raw.doctor) result.doctor = raw.doctor;
        if (typeof raw?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)) result.date = raw.date;
        if (typeof raw?.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time)) result.time = raw.time;
        if (Number.isInteger(raw?.appointmentId) && raw.appointmentId > 0) result.appointmentId = raw.appointmentId;
        if (Number.isInteger(raw?.optionIndex) && raw.optionIndex > 0) result.optionIndex = raw.optionIndex;
        return result;
    }
}
