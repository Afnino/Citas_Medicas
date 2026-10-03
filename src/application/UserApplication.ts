import bcrypt from "bcryptjs";
import { User } from "../domain/User.js";
import { UserPort } from "../domain/UserPort.js";
import { ApiError } from "../shared/ApiError.js";
import envs from "../infraestructure/config/environment-vars.js";
import { AuthApplication } from "./AuthApplication.js";

export class UserApplication {
    private port: UserPort;

    constructor(port: UserPort) {
        this.port = port;
    }

    async login(email: string, password: string): Promise<string> {
        const existUser = await this.port.getUserByEmail(email);
        if (!existUser) {
            throw new ApiError(401, "Credenciales invalidas");
        }

        const passMatch = await bcrypt.compare(password, existUser.password);
        if (!passMatch) {
            throw new ApiError(401, "Credenciales invalidas");
        }

        return AuthApplication.generateToken({
            id: existUser.id,
            email: existUser.email,
            role: existUser.role || "user",
        });
    }

    /**
     * Acceso de invitado: entra sin credenciales usando un usuario "demo"
     * compartido que se crea la primera vez. Sirve para que cualquiera
     * que vea el proyecto pruebe las funcionalidades sin registrarse.
     * La arquitectura de registro/login normal no cambia.
     */
    async demoLogin(): Promise<{ token: string; email: string }> {
        if (!envs.DEMO_LOGIN_ENABLED) {
            throw new ApiError(403, "El acceso de invitado esta desactivado");
        }

        let demo = await this.port.getUserByEmail(envs.DEMO_EMAIL);
        if (!demo) {
            const hashedPassword = await bcrypt.hash(envs.DEMO_PASSWORD, 12);
            const id = await this.port.createUser({
                name: "Invitado Demo",
                email: envs.DEMO_EMAIL,
                password: hashedPassword,
                status: 1,
                role: "user",
            });
            demo = { id, name: "Invitado Demo", email: envs.DEMO_EMAIL, password: hashedPassword, status: 1, role: "user" };
        }

        const token = AuthApplication.generateToken({
            id: demo.id,
            email: demo.email,
            role: demo.role || "user",
        });
        return { token, email: demo.email };
    }

    async createUser(user: Omit<User, "id">): Promise<number> {
        const existUser = await this.port.getUserByEmail(user.email);
        if (existUser) {
            throw new ApiError(409, "Este email ya esta registrado");
        }
        // Hashear la contrasena antes de guardarla.
        user.password = await bcrypt.hash(user.password, 12);
        user.role = user.role || "user";
        return this.port.createUser(user);
    }

    async getUserById(id: number): Promise<User | null> {
        return this.port.getUserById(id);
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return this.port.getUserByEmail(email);
    }

    async getAllUsers(): Promise<User[]> {
        return this.port.getAllUsers();
    }

    async updateUser(id: number, user: Partial<User>): Promise<boolean> {
        const existingUser = await this.port.getUserById(id);
        if (!existingUser) {
            throw new ApiError(404, "Usuario no encontrado");
        }

        if (user.email) {
            const emailTaken = await this.port.getUserByEmail(user.email);
            if (emailTaken && emailTaken.id !== id) {
                throw new ApiError(409, "El email ya esta en uso");
            }
        }

        return this.port.updateUser(id, user);
    }

    async deleteUser(id: number): Promise<boolean> {
        return this.port.deleteUser(id);
    }
}
