import Joi from 'joi';
import { ApiError } from '../../shared/ApiError.js';

export type ReturnEmail = {
    email: string;
};

type ValidationEmail = {
    error: Joi.ValidationError | undefined;
    value: ReturnEmail;
};

function validateEmail(data: any): ValidationEmail {
    const emailSchema = Joi.object({
        email: Joi
            .string()
            .email({ tlds: { allow: false } })
            .required()
            .messages({
                'string.email': 'Correo electronico no valido',
                'string.empty': 'El correo es requerido',
                'any.required': 'El correo es requerido',
            }),
    }).unknown(false); // No permitir campos extra

    const { error, value } = emailSchema.validate(data, { abortEarly: false });
    return { error, value };
}

export const loadEmail = (data: any): ReturnEmail => {
    const result = validateEmail(data);
    if (result.error) {
        const message = result.error.details.map((d) => d.message).join(', ');
        throw new ApiError(400, message);
    }
    return result.value;
};
