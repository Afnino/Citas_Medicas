export const ESTADOS_ACTIVOS = ["programada", "confirmada"];
export const DURACION_MINUTOS = 30;

export function esFecha(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

export function diaSemanaIso(fecha) {
  const dia = new Date(`${fecha}T12:00:00`).getDay();
  return dia === 0 ? 7 : dia;
}

export function aMinutos(hora) {
  const [horas, minutos] = String(hora).slice(0, 5).split(":").map(Number);
  return horas * 60 + minutos;
}

export function desdeMinutos(total) {
  const horas = String(Math.floor(total / 60)).padStart(2, "0");
  const minutos = String(total % 60).padStart(2, "0");
  return `${horas}:${minutos}`;
}

export function sumarMinutos(hora, minutos) {
  return desdeMinutos(aMinutos(hora) + minutos);
}

export function seSolapan(inicioA, finA, inicioB, finB) {
  return aMinutos(inicioA) < aMinutos(finB) && aMinutos(inicioB) < aMinutos(finA);
}

export function estaDentroDelHorario(horaInicio, horaFin, horario) {
  return (
    aMinutos(horaInicio) >= aMinutos(horario.hora_inicio) &&
    aMinutos(horaFin) <= aMinutos(horario.hora_fin)
  );
}

export function generarSlots(horario, duracionMinutos, citasOcupadas) {
  const slots = [];

  for (
    let inicio = aMinutos(horario.hora_inicio);
    inicio + duracionMinutos <= aMinutos(horario.hora_fin);
    inicio += duracionMinutos
  ) {
    const horaInicio = desdeMinutos(inicio);
    const horaFin = desdeMinutos(inicio + duracionMinutos);
    const cita = citasOcupadas.find((item) =>
      seSolapan(horaInicio, horaFin, item.hora_inicio, item.hora_fin),
    );

    slots.push({
      horaInicio,
      horaFin,
      disponible: !cita,
      citaId: cita?.id ?? null,
    });
  }

  return slots;
}

export function puedeCancelarse(estado) {
  return ESTADOS_ACTIVOS.includes(estado);
}
