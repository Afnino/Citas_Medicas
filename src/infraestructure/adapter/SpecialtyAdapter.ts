import { Repository } from "typeorm";
import { Specialty as SpecialtyDomain } from "../../domain/Specialty.js";
import { SpecialtyPort } from "../../domain/SpecialtyPort.js";
import { AppDataSource } from "../config/data-base.js";
import { SpecialtyEntity } from "../entities/Specialty.js";

export class SpecialtyAdapter implements SpecialtyPort {

    private specialtyRepository: Repository<SpecialtyEntity>

    constructor() {
        this.specialtyRepository = AppDataSource.getRepository(SpecialtyEntity);
    }
    //Transformar la entidad de infraestructura al modelo de dominio
    private toDomain(specialty: SpecialtyEntity): SpecialtyDomain {
        return {
            id: specialty.id,
            name: specialty.name,
            description: specialty.description
        };
    }

    // Sembrar las especialidades iniciales una sola vez (si la tabla esta vacia).
    async seedIfEmpty(): Promise<void> {
        const count = await this.specialtyRepository.count();
        if (count === 0) {
            await this.specialtyRepository.save([
                { name: "Medicina general", description: "Consulta general y control de salud" },
                { name: "Dermatologia", description: "Cuidado de la piel, el cabello y las unas" },
                { name: "Pediatria", description: "Atencion medica de ninos y adolescentes" },
                { name: "Cardiologia", description: "Salud del corazon y del sistema circulatorio" },
                { name: "Ginecologia", description: "Salud de la mujer" },
            ]);
        }
    }

    async createSpecialty(specialty: Omit<SpecialtyDomain, "id">): Promise<number> {
        try {
            const saved = await this.specialtyRepository.save(this.specialtyRepository.create(specialty));
            return saved.id;
        } catch (error) {
            console.error("Error creando especialidad:", error)
            throw new Error("Error al crear especialidad");
        }
    }
    async getSpecialtyById(id: number): Promise<SpecialtyDomain | null> {
        try {
            const specialty = await this.specialtyRepository.findOne({ where: { id } });
            return specialty ? this.toDomain(specialty) : null;
        } catch (error) {
            console.error("Error obteniendo especialidad por ID:", error)
            throw new Error("Error obteniendo especialidad");
        }
    }
    async getSpecialtyByName(name: string): Promise<SpecialtyDomain | null> {
        const specialty = await this.specialtyRepository.findOne({ where: { name } });
        return specialty ? this.toDomain(specialty) : null;
    }
    async getAllSpecialties(): Promise<SpecialtyDomain[]> {
        try {
            const specialties = await this.specialtyRepository.find({ order: { name: "ASC" } });
            return specialties.map((s) => this.toDomain(s));
        } catch (error) {
            console.error("Error obteniendo especialidades", error)
            throw new Error("Error obteniendo lista de especialidades");
        }
    }

}
