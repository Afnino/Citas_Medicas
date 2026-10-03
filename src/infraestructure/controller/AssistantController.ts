import { Request, Response } from "express";
import Joi from "joi";
import { AssistantApplication } from "../../application/AssistantApplication.js";
import { AssistantContext } from "../../domain/Assistant.js";
import { ApiError } from "../../shared/ApiError.js";

export class AssistantController {
  private app: AssistantApplication;

  constructor(application: AssistantApplication) {
    this.app = application;
  }

  // Recibe el TEXTO ya transcrito (la voz se convierte a texto en el cliente)
  // y devuelve el texto que el cliente puede leer en voz alta (`speech`).
  async talk(req: Request, res: Response): Promise<void> {
    const { error, value } = Joi.object({
      message: Joi.string().trim().min(1).max(500).required().messages({
        "string.empty": "El mensaje es requerido",
        "any.required": "El mensaje es requerido",
      }),
      context: Joi.object().unknown(true).default({}),
    }).unknown(false).validate(req.body, { abortEarly: false });

    if (error) {
      throw new ApiError(400, error.details.map((d) => d.message).join("; "));
    }
    const user = req.user!;
    const reply = await this.app.handle(user.id, user.role, value.message, value.context as AssistantContext);
    res.status(200).json(reply);
  }
}
