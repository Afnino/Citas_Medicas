import Joi from 'joi';
import { ApiError } from '../../shared/ApiError.js';
import { isValidDate } from '../../shared/dates.js';

export type ReturnAppointmentData = { doctorId: number; date: string; time: string; reason: string };
export type ReturnDateQuery = { date: string; specialtyId?: number };
export type ReturnRangeQuery = { from: string; to: string };

const date = (label: string) => Joi.string().custom((value, helpers) => (isValidDate(value) ? value : helpers.error('any.invalid')))
    .required().messages({
        'any.invalid': `${label} no es valida (usa YYYY-MM-DD)`,
        'string.empty': `${label} es requerida`,
        'any.required': `${label} es requerida`,
    });

function run<T>(schema: Joi.ObjectSchema, data: any): T {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
        throw new ApiError(400, error.details.map((d) => d.message).join('; '));
    }
    return value as T;
}

export const loadAppointmentData = (data: any): ReturnAppointmentData =>
    run(Joi.object({
        doctorId: Joi.number().integer().positive().required().messages({ 'any.required': 'El medico es requerido' }),
        date: date('La fecha'),
        time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required().messages({
            'string.pattern.base': 'La hora debe tener formato HH:MM',
            'any.required': 'La hora es requerida',
        }),
        reason: Joi.string().trim().max(500).allow('').default(''),
    }).unknown(false), data);

export const loadDateQuery = (data: any): ReturnDateQuery =>
    run(Joi.object({
        date: date('La fecha'),
        specialtyId: Joi.number().integer().positive(),
    }).unknown(false), data);

export const loadRangeQuery = (data: any): ReturnRangeQuery =>
    run(Joi.object({
        from: date('La fecha inicial'),
        to: date('La fecha final'),
    }).unknown(false), data);
