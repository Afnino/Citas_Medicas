import { AssistantCatalog, AssistantContext, AssistantInterpretation } from "./Assistant.js";

/**
 * Puerto del asistente. La logica de negocio solo conoce esta interfaz;
 * quien la implemente (reglas locales, un modelo de IA, etc.) es un
 * adaptador de infraestructura intercambiable.
 */
export interface AssistantPort{

    interpret(message: string, catalog: AssistantCatalog, context?: AssistantContext): Promise<AssistantInterpretation>;

}
