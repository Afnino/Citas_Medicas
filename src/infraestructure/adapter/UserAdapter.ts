import { Repository } from "typeorm";
import { User as UserDomain } from "../../domain/User.js";
import { UserPort } from "../../domain/UserPort.js";
import { AppDataSource } from "../config/data-base.js";
import { User as UserEntity } from "../entities/User.js";



export class UserAdapter implements UserPort {

    private userRepository: Repository<UserEntity>

   constructor() {
        this.userRepository = AppDataSource.getRepository(UserEntity);
    }
    //Transdormar la entidad de infraestructura(entidad user.ts)al modelo de dominio (interface User.ts)
    private toDomain(user: UserEntity): UserDomain {
        return {
            id: user.id_user,
            name: user.name_user,
            email: user.email_user,
            password: user.password_user,
            status: user.status_user,
            role: user.role_user

        };
    }
    //Transformar el modelo de dominio a la entidad de infraestructura
    private toEntity(user: Omit<UserDomain, "id">): UserEntity {
        const userEntity = new UserEntity();
        userEntity.name_user = user.name;
        userEntity.email_user = user.email;
        userEntity.password_user = user.password;
        userEntity.status_user = user.status;
        userEntity.role_user = user.role || "user";
        return userEntity;
    }

    async createUser(user: Omit<UserDomain, "id">): Promise<number> {
        try {
            const newUser = this.toEntity(user);
            const savedUser = await this.userRepository.save(newUser);
            return savedUser.id_user;
        } catch (error) {
            console.error("Error creando usuario:", error)
            throw new Error("Error al crear usuario");

        }
    }
    async updateUser(id: number, user: Partial<UserDomain>): Promise<boolean> {
        try {
            const existingUser = await this.userRepository.findOne({ where: { id_user: id } });
            if (!existingUser) return false;

            //Actualizar solo campos enviados
            Object.assign(existingUser, {
                name_user: user.name ?? existingUser.name_user,
                email_user: user.email ?? existingUser.email_user,
                password_user: user.password ?? existingUser.password_user,
                status_user: user.status ?? existingUser.status_user,
                role_user: user.role ?? existingUser.role_user,
            });
            await this.userRepository.save(existingUser);
            return true;
        } catch (error) {
            console.error("Error actualizando usuario:", error)
            throw new Error("Error actualizando usuario");
        }
    }
    async deleteUser(id: number): Promise<boolean> {
        try {
            const existingUser = await this.userRepository.findOne({ where: { id_user: id } });
            if (!existingUser) return false;
            //Actualizacion solo el estatus a 0 baja
            Object.assign(existingUser, {
                status_user: 0
            });
            await this.userRepository.save(existingUser);
            return true;
        } catch (error) {
            console.error("Error al dar de baja el usuario:", error)
            throw new Error("Error al dar de baja usuario");
        }
    }
    async getUserById(id: number): Promise<UserDomain | null> {
        try {
            const user = await this.userRepository.findOne({ where: { id_user: id } });
            return user ? this.toDomain(user) : null;
        } catch (error) {
            console.error("Error obteniendo usuario por ID:", error)
            throw new Error("Error obteniendo usuario");
        }
    }

    async getUserByEmail(email: string): Promise<UserDomain | null> {
        const user = await this.userRepository.findOne({ where: { email_user: email } });
        if (!user) return null;

        return {
            id: user.id_user,
            name: user.name_user,
            email: user.email_user,
            password: user.password_user,
            status: user.status_user,
            role: user.role_user
        };
    }
    async getAllUsers(): Promise<UserDomain[]> {
        try {
            const users = await this.userRepository.find({where : {status_user:1}});
            return users.map(this.toDomain);
        } catch (error) {
            console.error("Error obteniendo usuarios", error)
            throw new Error("Error obteniendo lista de usuarios");
        }
    }

}
