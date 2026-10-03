import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "doctor" })
export class DoctorEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "character varying", length: 255 })
  name!: string;

  @Column({ type: "integer" })
  specialty_id!: number;

  @Column({ type: "integer", default: 1 })
  status!: number;
}
