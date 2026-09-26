import { generarRespuesta } from "../adapters/outbound/ia/cliente-openai.js";

const MESES = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

function normalizarTexto(texto = "") {
  return String(texto)
    .trim()
    .toLowerCase()
    .replace(/�/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Comparación tolerante.
 *
 * Permite comparar:
 *
 * Laura Gómez
 * Laura G�mez
 *
 * y también:
 *
 * Dermatología
 * dermatolog�a
 */
function compararTextoTolerante(textoA = "", textoB = "") {
  const limpiar = (texto) => {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/�/g, "")
      .replace(/\b(dr|dra|doctor|doctora)\b/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const a = limpiar(textoA);
  const b = limpiar(textoB);

  // Coincidencia normal
  if (a === b) {
    return true;
  }

  /*
   * Comparación tolerante para caracteres dañados.
   *
   * Ejemplo:
   *
   * Laura Gómez
   * Laura G�mez
   *
   * Después de quitar vocales:
   *
   * lr g mz
   * lr g mz
   */
  const sinVocales = (texto) =>
    texto.replace(/[aeiou]/g, "");

  return sinVocales(a) === sinVocales(b);
}

function extraerFecha(mensaje) {
  const texto = normalizarTexto(mensaje);

  const coincidencia = texto.match(
    /(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/,
  );

  if (!coincidencia) {
    return null;
  }

  const dia = coincidencia[1].padStart(2, "0");
  const mes = MESES[coincidencia[2]];
  const anio = coincidencia[3];

  if (!mes) {
    return null;
  }

  return `${anio}-${mes}-${dia}`;
}

/**
 * Extrae la hora desde frases como:
 *
 * "a las 10 de la mañana"
 * "a las 10:30 de la mañana"
 * "a las 3 de la tarde"
 * "a las 15:00"
 * "a las 4"
 */
function extraerHora(mensaje) {
  const texto = normalizarTexto(mensaje);

  const coincidencia = texto.match(
    /a\s+las\s+(\d{1,2})(?::(\d{2}))?\s*(?:de\s+la\s+(manana|tarde|noche))?/,
  );

  if (!coincidencia) {
    return null;
  }

  let hora = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2] ?? "00");
  const periodo = coincidencia[3];

  if (periodo === "manana") {
    if (hora === 12) {
      hora = 0;
    }
  }

  if (periodo === "tarde" || periodo === "noche") {
    if (hora < 12) {
      hora += 12;
    }
  }

  return `${String(hora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

/**
 * Busca una persona dentro de una lista usando el nombre completo.
 */
function buscarPorNombre(lista, nombreBuscado) {
  const buscado = normalizarTexto(nombreBuscado)
    .replace(/\b(dr|dra|doctor|doctora)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  console.log(
    "BUSCANDO PERSONA:",
    nombreBuscado,
    "->",
    buscado,
  );

  const resultado = lista.find((item) => {
    const nombreCompleto =
      `${item.nombre} ${item.apellido}`;

    const coincide =
      compararTextoTolerante(
        nombreCompleto,
        buscado,
      );

    console.log(
      "COMPARANDO:",
      nombreCompleto,
      "VS",
      nombreBuscado,
      "=>",
      coincide,
    );

    return coincide;
  });

  return resultado;
}

/**
 * Extrae:
 *
 * "cita de dermatología con Elena Ruiz para Laura Gómez"
 */
function extraerDatosAgendamiento(mensaje) {
  const texto = mensaje.trim();

  const resultado = {
    paciente: null,
    especialidad: null,
    profesional: null,
  };

  /*
   * Patrón principal:
   *
   * "cita de dermatología con Elena Ruiz para Laura Gómez"
   */
  const patronAgendar = texto.match(
    /cita\s+(?:de|para)\s+(.+?)\s+con\s+(.+?)\s+para\s+(.+?)(?:\s+el\s+|\s+a\s+las\s+|$)/i,
  );

  if (patronAgendar) {
    resultado.especialidad =
      patronAgendar[1].trim();

    resultado.profesional =
      patronAgendar[2].trim();

    resultado.paciente =
      patronAgendar[3].trim();

    return resultado;
  }

  /*
   * Patrón alternativo:
   *
   * "de dermatología con Elena Ruiz para Laura Gómez"
   */
  const coincidencia = texto.match(
    /(?:de|para)\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+){0,3})\s+con\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+){0,3})\s+para\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+){0,3})/i,
  );

  if (coincidencia) {
    resultado.especialidad =
      coincidencia[1];

    resultado.profesional =
      coincidencia[2];

    resultado.paciente =
      coincidencia[3];
  }

  return resultado;
}

const herramientas = [
  // --------------------------------------------------
  // ESPECIALIDADES
  // --------------------------------------------------

  {
    type: "function",
    name: "listar_especialidades",
    description:
      "Obtiene todas las especialidades médicas disponibles.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },

  // --------------------------------------------------
  // PROFESIONALES
  // --------------------------------------------------

  {
    type: "function",
    name: "listar_profesionales",
    description:
      "Obtiene los profesionales médicos disponibles. Puede filtrar por especialidad.",
    parameters: {
      type: "object",
      properties: {
        especialidadId: {
          type: ["string", "null"],
          description:
            "ID de la especialidad. Usar null si no se desea filtrar.",
        },
      },
      required: ["especialidadId"],
      additionalProperties: false,
    },
    strict: true,
  },

  // --------------------------------------------------
  // DISPONIBILIDAD
  // --------------------------------------------------

  {
    type: "function",
    name: "consultar_disponibilidad",
    description:
      "Consulta los horarios disponibles para una especialidad y una fecha.",
    parameters: {
      type: "object",
      properties: {
        fecha: {
          type: "string",
          description:
            "Fecha en formato YYYY-MM-DD.",
        },

        especialidad: {
          type: "string",
          description:
            "Nombre de la especialidad médica.",
        },

        profesionalId: {
          type: ["string", "null"],
          description:
            "ID del profesional. Usar null si no se especificó profesional.",
        },

        duracionMinutos: {
          type: ["number", "null"],
          description:
            "Duración de la cita en minutos. Usar null para la duración predeterminada.",
        },
      },

      required: [
        "fecha",
        "especialidad",
        "profesionalId",
        "duracionMinutos",
      ],

      additionalProperties: false,
    },
    strict: true,
  },

  // --------------------------------------------------
  // AGENDAR CITA
  // --------------------------------------------------

  {
    type: "function",
    name: "agendar_cita",
    description:
      "Agenda una cita médica cuando el usuario haya proporcionado claramente paciente, especialidad, profesional, fecha y hora.",
    parameters: {
      type: "object",
      properties: {
        paciente: {
          type: "string",
          description:
            "Nombre completo del paciente.",
        },

        especialidad: {
          type: "string",
          description:
            "Nombre de la especialidad médica.",
        },

        profesional: {
          type: "string",
          description:
            "Nombre completo del profesional médico.",
        },

        fecha: {
          type: "string",
          description:
            "Fecha de la cita en formato YYYY-MM-DD.",
        },

        horaInicio: {
          type: "string",
          description:
            "Hora de inicio en formato HH:MM.",
        },

        motivo: {
          type: ["string", "null"],
          description:
            "Motivo de la consulta. Usar null si el usuario no lo indicó.",
        },
      },

      required: [
        "paciente",
        "especialidad",
        "profesional",
        "fecha",
        "horaInicio",
        "motivo",
      ],

      additionalProperties: false,
    },
    strict: true,
  },
];

export function crearCasosIA({
  casosCatalogo,
  casosCitas,
}) {
  return {
    async conversar(mensaje) {
      // --------------------------------------------------
      // DATOS DEL MENSAJE ORIGINAL
      // --------------------------------------------------

      const fechaSolicitada =
        extraerFecha(mensaje);

      const horaSolicitada =
        extraerHora(mensaje);

      const datosExtraidos =
        extraerDatosAgendamiento(mensaje);

      console.log(
        "FECHA EXTRAÍDA DEL USUARIO:",
        fechaSolicitada,
      );

      console.log(
        "HORA EXTRAÍDA DEL USUARIO:",
        horaSolicitada,
      );

      console.log(
        "DATOS AGENDAMIENTO EXTRAÍDOS:",
        datosExtraidos,
      );

      // --------------------------------------------------
      // INSTRUCCIONES PARA OPENAI
      // --------------------------------------------------

      const instrucciones = `
Eres un asistente virtual para una plataforma de citas médicas.

Tu función es ayudar al usuario a consultar y agendar citas.

REGLAS IMPORTANTES:

1. Respeta exactamente los datos proporcionados por el usuario.

2. Nunca inventes una fecha.

3. Nunca cambies una fecha proporcionada por el usuario.

4. Si el backend proporciona una fecha extraída del mensaje,
   utiliza exactamente esa fecha.

5. Nunca inventes nombres de pacientes.

6. Nunca inventes nombres de profesionales.

7. Nunca inventes especialidades.

8. Nunca inventes IDs.

9. Si el usuario quiere agendar una cita y proporciona paciente,
   especialidad, profesional, fecha y hora, debes utilizar
   agendar_cita.

10. No confundas consultar disponibilidad con agendar una cita.

11. Si el usuario dice claramente "quiero agendar",
    "quiero reservar", "agenda una cita" o una expresión equivalente,
    la intención es AGENDAR.

12. Para agendar necesitas:
    - paciente
    - especialidad
    - profesional
    - fecha
    - hora de inicio

13. Si falta algún dato obligatorio, pregunta al usuario.

14. Para una hora expresada como:
    "10 de la mañana"
    utiliza:
    "10:00"

15. Para:
    "3 de la tarde"
    utiliza:
    "15:00"

16. No cambies la hora solicitada por el usuario.

17. Si agendar_cita devuelve un error de disponibilidad,
    informa al usuario que ese horario no está disponible.

18. Si la cita se crea correctamente,
    confirma que la cita fue agendada.

19. Responde siempre en español.

DATOS EXTRAÍDOS DIRECTAMENTE DEL MENSAJE ORIGINAL:

Fecha:
${fechaSolicitada ?? "No encontrada"}

Hora:
${horaSolicitada ?? "No encontrada"}

Paciente:
${datosExtraidos.paciente ?? "No encontrado"}

Especialidad:
${datosExtraidos.especialidad ?? "No encontrada"}

Profesional:
${datosExtraidos.profesional ?? "No encontrado"}

SOLICITUD ORIGINAL DEL USUARIO:
${mensaje}
`;

      let respuesta =
        await generarRespuesta({
          input: instrucciones,
          tools: herramientas,
        });

      // --------------------------------------------------
      // CICLO DE HERRAMIENTAS
      // --------------------------------------------------

      while (true) {
        const llamadasHerramientas =
          respuesta.output.filter(
            (item) =>
              item.type === "function_call",
          );

        if (
          llamadasHerramientas.length === 0
        ) {
          return respuesta;
        }

        const resultados = [];

        for (
          const llamada of llamadasHerramientas
        ) {
          // ==============================================
          // LISTAR ESPECIALIDADES
          // ==============================================

          if (
            llamada.name ===
            "listar_especialidades"
          ) {
            const especialidades =
              await casosCatalogo.especialidades();

            resultados.push({
              type: "function_call_output",
              call_id: llamada.call_id,
              output:
                JSON.stringify(
                  especialidades,
                ),
            });

            continue;
          }

          // ==============================================
          // LISTAR PROFESIONALES
          // ==============================================

          if (
            llamada.name ===
            "listar_profesionales"
          ) {
            const argumentos =
              JSON.parse(
                llamada.arguments,
              );

            const profesionales =
              await casosCatalogo.profesionales(
                argumentos.especialidadId,
              );

            resultados.push({
              type: "function_call_output",
              call_id: llamada.call_id,
              output:
                JSON.stringify(
                  profesionales,
                ),
            });

            continue;
          }

          // ==============================================
          // CONSULTAR DISPONIBILIDAD
          // ==============================================

          if (
            llamada.name ===
            "consultar_disponibilidad"
          ) {
            const argumentos =
              JSON.parse(
                llamada.arguments,
              );

            console.log(
              "ARGUMENTOS DISPONIBILIDAD:",
              argumentos,
            );

            const fechaFinal =
              fechaSolicitada ??
              argumentos.fecha;

            const especialidades =
              await casosCatalogo.especialidades();

            const especialidadBuscada =
              especialidades.find(
                (item) =>
                  compararTextoTolerante(
                    item.nombre,
                    argumentos.especialidad,
                  ),
              );

            if (!especialidadBuscada) {
              resultados.push({
                type:
                  "function_call_output",

                call_id:
                  llamada.call_id,

                output:
                  JSON.stringify({
                    error:
                      `No se encontró la especialidad "${argumentos.especialidad}".`,
                  }),
              });

              continue;
            }

            console.log(
              "ESPECIALIDAD RESUELTA:",
              especialidadBuscada.nombre,
              especialidadBuscada.id,
            );

            console.log(
              "FECHA FINAL UTILIZADA:",
              fechaFinal,
            );

            const disponibilidad =
              await casosCitas.disponibilidad({
                fecha: fechaFinal,

                especialidadId:
                  especialidadBuscada.id,

                profesionalId:
                  argumentos.profesionalId,

                duracionMinutos:
                  argumentos.duracionMinutos,
              });

            resultados.push({
              type:
                "function_call_output",

              call_id:
                llamada.call_id,

              output:
                JSON.stringify(
                  disponibilidad,
                ),
            });

            continue;
          }

          // ==============================================
          // AGENDAR CITA
          // ==============================================

          if (
            llamada.name ===
            "agendar_cita"
          ) {
            const argumentos =
              JSON.parse(
                llamada.arguments,
              );

            console.log(
              "ARGUMENTOS AGENDAR GENERADOS POR IA:",
              argumentos,
            );

            // ------------------------------------------
            // USAR DATOS DEL MENSAJE ORIGINAL
            // ------------------------------------------

            const pacienteNombre =
              datosExtraidos.paciente ??
              argumentos.paciente;

            const especialidadNombre =
              datosExtraidos.especialidad ??
              argumentos.especialidad;

            const profesionalNombre =
              datosExtraidos.profesional ??
              argumentos.profesional;

            const fechaFinal =
              fechaSolicitada ??
              argumentos.fecha;

            const horaFinal =
              horaSolicitada ??
              argumentos.horaInicio;

            console.log(
              "DATOS FINALES PARA AGENDAR:",
              {
                paciente:
                  pacienteNombre,

                especialidad:
                  especialidadNombre,

                profesional:
                  profesionalNombre,

                fecha:
                  fechaFinal,

                horaInicio:
                  horaFinal,
              },
            );

            // ------------------------------------------
            // VALIDAR DATOS
            // ------------------------------------------

            if (
              !pacienteNombre ||
              !especialidadNombre ||
              !profesionalNombre ||
              !fechaFinal ||
              !horaFinal
            ) {
              resultados.push({
                type:
                  "function_call_output",

                call_id:
                  llamada.call_id,

                output:
                  JSON.stringify({
                    exito: false,
                    error:
                      "Faltan datos obligatorios para agendar la cita.",
                  }),
              });

              continue;
            }

            // ------------------------------------------
            // CARGAR CATÁLOGOS REALES
            // ------------------------------------------

            const [
              pacientes,
              profesionales,
              especialidades,
            ] = await Promise.all([
              casosCatalogo.pacientes(),
              casosCatalogo.profesionales(),
              casosCatalogo.especialidades(),
            ]);

            // ------------------------------------------
            // BUSCAR PACIENTE REAL
            // ------------------------------------------

            const pacienteBuscado =
              buscarPorNombre(
                pacientes,
                pacienteNombre,
              );

            if (!pacienteBuscado) {
              resultados.push({
                type:
                  "function_call_output",

                call_id:
                  llamada.call_id,

                output:
                  JSON.stringify({
                    exito: false,

                    error:
                      `No se encontró el paciente "${pacienteNombre}".`,
                  }),
              });

              continue;
            }

            // ------------------------------------------
            // BUSCAR ESPECIALIDAD REAL
            // ------------------------------------------

            const especialidadBuscada =
              especialidades.find(
                (item) =>
                  compararTextoTolerante(
                    item.nombre,
                    especialidadNombre,
                  ),
              );

            if (!especialidadBuscada) {
              resultados.push({
                type:
                  "function_call_output",

                call_id:
                  llamada.call_id,

                output:
                  JSON.stringify({
                    exito: false,

                    error:
                      `No se encontró la especialidad "${especialidadNombre}".`,
                  }),
              });

              continue;
            }

            // ------------------------------------------
            // BUSCAR PROFESIONAL REAL
            // ------------------------------------------

            const profesionalBuscado =
              buscarPorNombre(
                profesionales,
                profesionalNombre,
              );

            if (!profesionalBuscado) {
              resultados.push({
                type:
                  "function_call_output",

                call_id:
                  llamada.call_id,

                output:
                  JSON.stringify({
                    exito: false,

                    error:
                      `No se encontró el profesional "${profesionalNombre}".`,
                  }),
              });

              continue;
            }

            // ------------------------------------------
            // LOGS
            // ------------------------------------------

            console.log(
              "PACIENTE RESUELTO:",
              pacienteBuscado.nombre,
              pacienteBuscado.apellido,
              pacienteBuscado.id,
            );

            console.log(
              "ESPECIALIDAD RESUELTA:",
              especialidadBuscada.nombre,
              especialidadBuscada.id,
            );

            console.log(
              "PROFESIONAL RESUELTO:",
              profesionalBuscado.nombre,
              profesionalBuscado.apellido,
              profesionalBuscado.id,
            );

            console.log(
              "FECHA FINAL UTILIZADA:",
              fechaFinal,
            );

            console.log(
              "HORA FINAL UTILIZADA:",
              horaFinal,
            );

            // ------------------------------------------
            // CREAR CITA
            // ------------------------------------------

            try {
              const cita =
                await casosCitas.agendar({
                  pacienteId:
                    pacienteBuscado.id,

                  profesionalId:
                    profesionalBuscado.id,

                  especialidadId:
                    especialidadBuscada.id,

                  fecha:
                    fechaFinal,

                  horaInicio:
                    horaFinal,

                  motivo:
                    argumentos.motivo,

                  notas: null,
                });

              resultados.push({
                type:
                  "function_call_output",

                call_id:
                  llamada.call_id,

                output:
                  JSON.stringify({
                    exito: true,
                    cita,
                  }),
              });
            } catch (error) {
              resultados.push({
                type:
                  "function_call_output",

                call_id:
                  llamada.call_id,

                output:
                  JSON.stringify({
                    exito: false,
                    error:
                      error.message,
                  }),
              });
            }

            continue;
          }
        }

        // --------------------------------------------------
        // CONTINUAR CON OPENAI
        // --------------------------------------------------

        respuesta =
          await generarRespuesta({
            input: [
              ...respuesta.output,
              ...resultados,
            ],

            tools: herramientas,
          });
      }
    },
  };
}