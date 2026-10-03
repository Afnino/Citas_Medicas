import { Specialty } from "../domain/Specialty.js";
import { SpecialtyPort } from "../domain/SpecialtyPort.js";
import { ApiError } from "../shared/ApiError.js";

export class SpecialtyApplication {
    private port: SpecialtyPort;

    constructor(port: SpecialtyPort) {
        this.port = port;
    }

    async createSpecialty(specialty: Omit<Specialty, "id">): Promise<number> {
        const exist = await this.port.getSpecialtyByName(specialty.name);
        if (exist) {
            throw new ApiError(409, "Esa especialidad ya existe");
        }
        return this.port.createSpecialty(specialty);
    }

    async getSpecialtyById(id: number): Promise<Specialty | null> {
        return this.port.getSpecialtyById(id);
    }

    async getAllSpecialties(): Promise<Specialty[]> {
        return this.port.getAllSpecialties();
    }
}
