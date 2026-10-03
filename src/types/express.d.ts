import "express";

/**
 * Extiende Request con el usuario autenticado que inyecta
 * el middleware `authenticateToken`.
 */
declare module "express-serve-static-core" {
    interface Request {
        user?: {
            id: number;
            email: string;
            role: string;
        };
    }
}
