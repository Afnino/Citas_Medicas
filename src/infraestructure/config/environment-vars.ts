import "dotenv/config";
import Joi from 'joi';


export type ReturnEnvironmentVars = {
    NODE_ENV: string;
    PORT: number;
    TIMEZONE: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    DEMO_LOGIN_ENABLED: boolean;
    DEMO_EMAIL: string;
    DEMO_PASSWORD: string;
    ASSISTANT_PROVIDER: string;
    ANTHROPIC_API_KEY: string;
    ANTHROPIC_MODEL: string;
}

type ValidationEnvironmentVars = {
    error: Joi.ValidationError | undefined,
    value: ReturnEnvironmentVars
}

function validateEnvVars(vars: NodeJS.ProcessEnv): ValidationEnvironmentVars {
    const envSchema = Joi.object({
        NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
        PORT: Joi.number().default(4000),
        TIMEZONE: Joi.string().default("America/Bogota"),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow("").optional(),
        DB_NAME: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default("30m"),
        // Acceso de invitado (demo): permite entrar sin registrarse.
        DEMO_LOGIN_ENABLED: Joi.boolean().default(true),
        DEMO_EMAIL: Joi.string().email({ tlds: { allow: false } }).default("demo@demo.local"),
        DEMO_PASSWORD: Joi.string().min(8).default("Demo1234"),
        // Asistente de voz / IA
        ASSISTANT_PROVIDER: Joi.string().valid("rules", "anthropic").default("rules"),
        ANTHROPIC_API_KEY: Joi.string().allow("").default(""),
        ANTHROPIC_MODEL: Joi.string().default("claude-sonnet-5-5"),
    }).unknown(true);
    const { error, value } = envSchema.validate(vars);
    return { error, value }
}

const loadEnvVars = (): ReturnEnvironmentVars => {
    // Validar Datos
    const result = validateEnvVars(process.env);
    if (result.error) {
        throw new Error(result.error.message)
    }
    const value = result.value;
    return {
        NODE_ENV: value.NODE_ENV,
        PORT: value.PORT,
        TIMEZONE: value.TIMEZONE,
        DB_HOST: value.DB_HOST,
        DB_PORT: value.DB_PORT,
        DB_USER: value.DB_USER,
        DB_PASSWORD: value.DB_PASSWORD,
        DB_NAME: value.DB_NAME,
        JWT_SECRET: value.JWT_SECRET,
        JWT_EXPIRES_IN: value.JWT_EXPIRES_IN,
        DEMO_LOGIN_ENABLED: value.DEMO_LOGIN_ENABLED,
        DEMO_EMAIL: value.DEMO_EMAIL,
        DEMO_PASSWORD: value.DEMO_PASSWORD,
        ASSISTANT_PROVIDER: value.ASSISTANT_PROVIDER,
        ANTHROPIC_API_KEY: value.ANTHROPIC_API_KEY,
        ANTHROPIC_MODEL: value.ANTHROPIC_MODEL
    }
}

const envs = loadEnvVars();
export default envs;
