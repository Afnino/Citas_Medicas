import jwt, { SignOptions } from "jsonwebtoken";
import envs from "../infraestructure/config/environment-vars.js";

const JWT_SECRET = envs.JWT_SECRET;
const JWT_EXPIRES_IN = envs.JWT_EXPIRES_IN;

export class AuthApplication {

    static generateToken(payload: object): string {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
    }

    static verifyToken(token: string): any {
        return jwt.verify(token, JWT_SECRET);
    }
}
