import { DataSource } from "typeorm";
import { Client } from "pg";
import envs from "./environment-vars.js";
import { User as UserEntity } from "../entities/User.js";
import { SpecialtyEntity } from "../entities/Specialty.js";
import { DoctorEntity } from "../entities/Doctor.js";
import { DoctorScheduleEntity } from "../entities/DoctorSchedule.js";
import { AppointmentEntity } from "../entities/Appointment.js";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: envs.DB_HOST,
    port: Number(envs.DB_PORT),
    username: envs.DB_USER,
    password: envs.DB_PASSWORD,
    database: envs.DB_NAME,
    schema: "citas",
    // El proyecto no usa migraciones: el esquema se crea/actualiza solo.
    synchronize: true,
    logging: envs.NODE_ENV === "development",
    entities: [UserEntity, SpecialtyEntity, DoctorEntity, DoctorScheduleEntity, AppointmentEntity],
    extra: {
        // La instancia local de PostgreSQL no usa SSL.
        ssl: false,
    },
});

// TypeORM crea las tablas pero NO el esquema: se crea antes con una conexion
// corta de "pg" (CREATE SCHEMA IF NOT EXISTS es seguro si ya existe).
const ensureSchema = async (): Promise<void> => {
    const client = new Client({
        host: envs.DB_HOST,
        port: Number(envs.DB_PORT),
        user: envs.DB_USER,
        password: envs.DB_PASSWORD,
        database: envs.DB_NAME,
    });
    await client.connect();
    try {
        await client.query('CREATE SCHEMA IF NOT EXISTS "citas"');
    } finally {
        await client.end();
    }
};

// Conectar a la BD
export const connectDB = async (): Promise<void> => {
    try {
        await ensureSchema();
        await AppDataSource.initialize();
        console.log("Conectado a la base de datos PostgreSQL");
    } catch (error) {
        console.error("Error al conectar la base de datos", error);
        process.exit(1);
    }
};

// Comprobar que la conexion sigue viva (lo usa GET /api/health).
export const checkDB = async (): Promise<boolean> => {
    await AppDataSource.query("SELECT 1");
    return true;
};
