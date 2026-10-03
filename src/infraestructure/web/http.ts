import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../shared/ApiError.js";
import envs from "../config/environment-vars.js";

/**
 * Envuelve un handler async para que cualquier error (throw o promesa
 * rechazada) llegue al middleware central de errores en vez de dejar
 * la peticion colgada.
 */
export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
    (req, res, next) => {
        fn(req, res, next).catch(next);
    };

/**
 * Middleware central de errores. Debe registrarse al final de la cadena
 * (despues de las rutas).
 */
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }

    console.error("Error no controlado:", err);
    const body: Record<string, unknown> = { error: "Error interno del servidor" };
    if (envs.NODE_ENV !== "production" && err instanceof Error) {
        body.details = err.message;
    }
    res.status(500).json(body);
}
