import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// Un medico no puede tener dos citas PROGRAMADAS en la misma fecha y hora.
// Las canceladas no cuentan, asi el horario vuelve a quedar libre.
// Es la defensa final contra dos personas agendando el mismo horario a la vez.
@Index("uq_appointment_slot", ["doctor_id", "appointment_date", "appointment_time"], {
  unique: true,
  where: "status = 'scheduled'",
})
@Entity({ name: "appointment" })
export class AppointmentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer" })
  user_id!: number;

  @Column({ type: "integer" })
  doctor_id!: number;

  @Column({ type: "date" })
  appointment_date!: string;

  @Column({ type: "time" })
  appointment_time!: string;

  @Column({ type: "text", default: "" })
  reason!: string;

  @Column({ type: "character varying", length: 20, default: "scheduled" })
  status!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;
}
