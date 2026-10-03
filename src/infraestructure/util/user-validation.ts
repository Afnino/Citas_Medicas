import Joi from 'joi';
import { ApiError } from '../../shared/ApiError.js';

export type ReturnUserData = {
    name: string;
    email: string;
    password: string;
    status: number;
};

type ValidationUserData = {
    error: Joi.ValidationError | undefined;
    value: ReturnUserData;
};

function validateUserData(data: any): ValidationUserData {
    const userSchema = Joi.object({
        name: Joi.string()
            .trim()
            .min(3)
            .pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/)
            .required()
            .messages({
                'string.base': 'El nombre debe ser un texto',
                'string.empty': 'El nombre es requerido',
                'string.min': 'El nombre debe tener al menos 3 caracteres',
                'string.pattern.base': 'El nombre solo puede contener letras y espacios',
            }),
        email: Joi.string()
            .email({ tlds: { allow: false } })
            .required()
            .messages({
                'string.email': 'Correo electronico no valido',
                'string.empty': 'El correo es requerido',
                'any.required': 'El correo es requerido',
            }),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)
            .required()
            .messages({
                'string.min': 'La contrasena debe tener al menos 8 caracteres',
                'string.pattern.base': 'La contrasena debe tener al menos una mayuscula y un numero',
                'string.empty': 'La contrasena es requerida',
                'any.required': 'La contrasena es requerida',
            }),
        status: Joi.number()
            .valid(0, 1)
            .default(1)
            .messages({
                'number.base': 'El estado debe ser numerico',
                'any.only': 'El estado debe ser 0 o 1',
            }),
    }).unknown(false);

    const { error, value } = userSchema.validate(data, { abortEarly: false });
    return { error, value };
}

export const loadUserData = (data: any): ReturnUserData => {
    const result = validateUserData(data);
    if (result.error) {
        const message = result.error.details.map((d) => d.message).join('; ');
        throw new ApiError(400, message);
    }
    return result.value;
};
