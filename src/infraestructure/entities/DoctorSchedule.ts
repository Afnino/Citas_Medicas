import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "doctor_schedule" })
export class DoctorScheduleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer" })
  doctor_id!: number;

  // 0 = domingo ... 6 = sabado
  @Column({ type: "integer" })
  day_of_week!: number;

  @Column({ type: "time" })
  start_time!: string;

  @Column({ type: "time" })
  end_time!: string;

  @Column({ type: "integer", default: 30 })
  slot_minutes!: number;
}
