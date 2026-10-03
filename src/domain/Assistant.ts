/**
 * Modelo del asistente de voz/IA.
 * El asistente NO ejecuta nada: solo interpreta lo que dijo la persona.
 * Quien ejecuta (consultar, agendar, cancelar) es la capa de aplicacion.
 */
export type AssistantIntent =
    | "help"
    | "list_specialties"
    | "list_doctors"
    | "check_availability"
    | "book_appointment"
    | "cancel_appointment"
    | "my_appointments"
    | "select_option"
    | "confirm"
    | "deny"
    | "unknown";

export interface AssistantInterpretation{
    intent: AssistantIntent;
    specialty?: string;       // nombre de especialidad del catalogo
    doctor?: string;          // nombre de medico del catalogo
    date?: string;            // "YYYY-MM-DD"
    time?: string;            // "HH:MM"
    appointmentId?: number;
    optionIndex?: number;     // 1 = primera opcion
}

/** Lo que el interprete necesita saber del entorno para entender frases. */
export interface AssistantCatalog{
    today: string;            // "YYYY-MM-DD"
    specialties: string[];
    doctors: { name: string; specialty: string }[];
}

/** Estado de la conversacion; el cliente lo devuelve en cada mensaje. */
export interface AssistantContext{
    awaiting?: "option" | "confirm";
    pending?: {
        type: "book" | "cancel";
        doctorId?: number;
        date?: string;
        time?: string;
        appointmentId?: number;
    };
    options?: { doctorId?: number; date?: string; time?: string; appointmentId?: number }[];
    // Datos ya entendidos en turnos anteriores (ej. la especialidad)
    specialty?: string;
    doctor?: string;
    date?: string;
    time?: string;
    intent?: AssistantIntent;
}

export interface AssistantReply{
    reply: string;            // texto para mostrar
    speech: string;           // texto para sintetizar a voz (el cliente decide como)
    intent: AssistantIntent;
    context: AssistantContext;
    options?: string[];       // opciones numeradas legibles para la persona
}
