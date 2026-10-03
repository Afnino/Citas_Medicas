/**
 * Error de aplicacion con un codigo HTTP asociado.
 * Lo lanzan las capas de aplicacion / validacion y lo traduce
 * el middleware central de errores (ver infraestructure/web/http.ts).
 */
export class ApiError extends Error {
    constructor(public readonly statusCode: number, message: string) {
        super(message);
        this.name = "ApiError";
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
