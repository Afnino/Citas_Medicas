import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "specialty" })
export class SpecialtyEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "character varying", length: 120, unique: true })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;
}
