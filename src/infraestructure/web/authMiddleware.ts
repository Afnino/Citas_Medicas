import { NextFunction, Request, Response } from "express";
import { AuthApplication } from "../../application/AuthApplication.js";

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        res.status(401).json({ error: "Falta el token de autenticacion" });
        return;
    }

    try {
        const payload = AuthApplication.verifyToken(token);
        req.user = {
            id: payload.id,
            email: payload.email,
            role: payload.role ?? "user",
        };
        next();
    } catch (error) {
        res.status(403).json({ error: "Token invalido o expirado" });
    }
}

export function authorizeRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            res.status(403).json({ error: "No autorizado" });
            return;
        }
        next();
    };
}
