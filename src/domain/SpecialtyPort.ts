import { Specialty } from "./Specialty.js";

export interface SpecialtyPort{

    createSpecialty(specialty: Omit<Specialty, "id">): Promise <number>;
    getSpecialtyById(id:number):Promise<Specialty| null>;
    getSpecialtyByName(name: string): Promise<Specialty| null>;
    getAllSpecialties(): Promise<Specialty[]>;

}
