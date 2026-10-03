import Joi from 'joi';
import { ApiError } from '../../shared/ApiError.js';

export type ReturnSpecialtyData = { name: string; description: string };
export type ReturnDoctorData = { name: string; specialtyId: number; status: number };
export type ReturnScheduleData = { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number };

const time = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required().messages({
    'string.pattern.base': 'La hora debe tener formato HH:MM',
    'any.required': 'La hora es requerida',
});

function run<T>(schema: Joi.ObjectSchema, data: any, separator: string): T {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
        throw new ApiError(400, error.details.map((d) => d.message).join(separator));
    }
    return value as T;
}

export const loadSpecialtyData = (data: any): ReturnSpecialtyData =>
    run(Joi.object({
        name: Joi.string().trim().min(3).max(120).required().messages({
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 3 caracteres',
            'any.required': 'El nombre es requerido',
        }),
        description: Joi.string().trim().allow('').default(''),
    }).unknown(false), data, '; ');

export const loadDoctorData = (data: any): ReturnDoctorData =>
    run(Joi.object({
        name: Joi.string().trim().min(3).max(255).required().messages({
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 3 caracteres',
            'any.required': 'El nombre es requerido',
        }),
        specialtyId: Joi.number().integer().positive().required().messages({
            'any.required': 'La especialidad es requerida',
        }),
        status: Joi.number().valid(0, 1).default(1),
    }).unknown(false), data, '; ');

export const loadScheduleData = (data: any): ReturnScheduleData =>
    run(Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6).required().messages({
            'number.min': 'El dia debe estar entre 0 (domingo) y 6 (sabado)',
            'number.max': 'El dia debe estar entre 0 (domingo) y 6 (sabado)',
            'any.required': 'El dia es requerido',
        }),
        startTime: time,
        endTime: time,
        slotMinutes: Joi.number().integer().min(10).max(120).default(30),
    }).unknown(false), data, '; ');
