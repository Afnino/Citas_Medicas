import { Request, Response } from "express";
import { UserApplication } from "../../application/UserApplication.js";
import { User } from "../../domain/User.js";
import { ApiError } from "../../shared/ApiError.js";
import { loadEmail } from "../util/email-validation.js";
import { loadUserData } from "../util/user-validation.js";

/**
 * Controlador HTTP. Cada metodo asume que se monta con `asyncHandler`,
 * por lo que puede lanzar `ApiError` y dejar que el middleware central
 * de errores construya la respuesta.
 */
export class UserController {
  private app: UserApplication;

  constructor(application: UserApplication) {
    this.app = application;
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new ApiError(400, "Email y contrasena son requeridos");
    }
    const token = await this.app.login(email, password);
    res.status(200).json({ message: "Login exitoso", token });
  }

  async demoLogin(_req: Request, res: Response): Promise<void> {
    const { token, email } = await this.app.demoLogin();
    res.status(200).json({ message: "Acceso de invitado", token, email });
  }

  async createUser(req: Request, res: Response): Promise<void> {
    const { name, email, password, status } = loadUserData(req.body);
    const user: Omit<User, "id"> = { name, email, password, status };
    const UserId = await this.app.createUser(user);

    res.status(201).json({ message: "Usuario creado con exito", UserId });
  }

  async getUserByEmail(req: Request, res: Response): Promise<void> {
    const { email } = loadEmail(req.params);
    const user = await this.app.getUserByEmail(email);
    if (!user) throw new ApiError(404, "Usuario no encontrado");

    const { password, ...safeUser } = user;
    res.status(200).json(safeUser);
  }

  async getAllUsers(_req: Request, res: Response): Promise<void> {
    const users = await this.app.getAllUsers();
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.status(200).json(safeUsers);
  }
}
