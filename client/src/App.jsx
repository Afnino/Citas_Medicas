import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'
import {
  AppShell,
  Button,
  Group,
  NativeSelect,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DayView } from '@mantine/schedule'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useEffect, useMemo, useRef, useState } from 'react'

const API = import.meta.env.SERVER_URL
const today = dayjs().format('YYYY-MM-DD')

const coloresEstado = {
  programada: 'blue',
  confirmada: 'violet',
  completada: 'teal',
  cancelada: 'gray',
  no_asistio: 'red',
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Error en el servidor')
  }

  return data
}

function nombreCompleto(persona) {
  if (!persona) return ''
  return `${persona.nombre} ${persona.apellido}`
}

function App() {
  const [fecha, setFecha] = useState(today)
  const [citas, setCitas] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const [profesionalConsulta, setProfesionalConsulta] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [profesionalId, setProfesionalId] = useState('')
  const [especialidadId, setEspecialidadId] = useState('')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [motivo, setMotivo] = useState('')

  // ------------------------------------------
  // ESTADOS DEL ASISTENTE DE VOZ
  // ------------------------------------------

  const [escuchando, setEscuchando] = useState(false)
  const [procesandoVoz, setProcesandoVoz] = useState(false)
  const [textoVoz, setTextoVoz] = useState('')
  const [respuestaIA, setRespuestaIA] = useState('')

  const reconocimientoRef = useRef(null)

  // ------------------------------------------
  // CATALOGO
  // ------------------------------------------

  async function cargarCatalogo() {
    const [
      listaPacientes,
      listaProfesionales,
      listaEspecialidades,
    ] = await Promise.all([
      api('/pacientes'),
      api('/profesionales'),
      api('/especialidades'),
    ])

    setPacientes(listaPacientes)
    setProfesionales(listaProfesionales)
    setEspecialidades(listaEspecialidades)

    setPacienteId(
      (actual) => actual || listaPacientes[0]?.id || '',
    )

    setProfesionalId(
      (actual) => actual || listaProfesionales[0]?.id || '',
    )

    setEspecialidadId(
      (actual) => actual || listaEspecialidades[0]?.id || '',
    )

    setProfesionalConsulta(
      (actual) => actual || listaProfesionales[0]?.id || '',
    )
  }

  async function cargarCitas(dia = fecha) {
    const lista = await api(
      `/citas?fecha=${encodeURIComponent(dia)}`,
    )

    setCitas(lista)
  }

  useEffect(() => {
    cargarCatalogo().catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    cargarCitas(fecha).catch((err) => setError(err.message))
  }, [fecha])

  // ------------------------------------------
  // EVENTOS DEL CALENDARIO
  // ------------------------------------------

  const events = useMemo(
    () =>
      citas
        .filter((cita) => cita.estado !== 'cancelada')
        .map((cita) => ({
          id: cita.id,
          title: `${nombreCompleto(cita.pacientes)} · ${
            cita.especialidades?.nombre ?? ''
          }`,
          start: `${cita.fecha} ${cita.hora_inicio}`,
          end: `${cita.fecha} ${cita.hora_fin}`,
          color: coloresEstado[cita.estado] ?? 'blue',
        })),
    [citas],
  )

  // ------------------------------------------
  // DISPONIBILIDAD
  // ------------------------------------------

  async function consultarDisponibilidad(event) {
    event.preventDefault()

    setError('')
    setMensaje('')

    try {
      const data = await api(
        `/disponibilidad?fecha=${encodeURIComponent(
          fecha,
        )}&profesionalId=${encodeURIComponent(
          profesionalConsulta,
        )}`,
      )

      setDisponibilidad(data)
    } catch (err) {
      setError(err.message)
    }
  }

  // ------------------------------------------
  // AGENDAR CITA
  // ------------------------------------------

  async function agendarCita(event) {
    event.preventDefault()

    setError('')
    setMensaje('')

    try {
      await api('/citas', {
        method: 'POST',
        body: JSON.stringify({
          pacienteId,
          profesionalId,
          especialidadId,
          fecha,
          horaInicio,
          motivo,
        }),
      })

      setMensaje('Cita agendada')

      await cargarCitas(fecha)
    } catch (err) {
      setError(err.message)
    }
  }

  // ------------------------------------------
  // CANCELAR CITA
  // ------------------------------------------

  async function cancelarCita(id) {
    setError('')
    setMensaje('')

    try {
      await api(`/citas/${id}/cancelar`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      setMensaje('Cita cancelada')

      await cargarCitas(fecha)
    } catch (err) {
      setError(err.message)
    }
  }

  // ------------------------------------------
  // ENVIAR MENSAJE A LA IA
  // ------------------------------------------

  async function enviarMensajeIA(mensajeUsuario) {
    if (!mensajeUsuario?.trim()) {
      return
    }

    setError('')
    setRespuestaIA('')
    setProcesandoVoz(true)

    try {
      const data = await api('/ia/chat', {
        method: 'POST',
        body: JSON.stringify({
          mensaje: mensajeUsuario,
        }),
      })

      const respuesta = data.respuesta ?? ''

      setRespuestaIA(respuesta)

      // ------------------------------------------
      // TEXTO → VOZ
      // ------------------------------------------

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()

        const voz = new SpeechSynthesisUtterance(respuesta)

        voz.lang = 'es-CO'
        voz.rate = 1
        voz.pitch = 1
        voz.volume = 1

        window.speechSynthesis.speak(voz)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesandoVoz(false)
    }
  }

  // ------------------------------------------
  // INICIAR RECONOCIMIENTO DE VOZ
  // ------------------------------------------

  function iniciarVoz() {
    setError('')

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError(
        'Tu navegador no soporta reconocimiento de voz. Prueba con Google Chrome.',
      )

      return
    }

    if (escuchando) {
      reconocimientoRef.current?.stop()
      return
    }

    const reconocimiento = new SpeechRecognition()

    reconocimiento.lang = 'es-CO'
    reconocimiento.continuous = false
    reconocimiento.interimResults = false
    reconocimiento.maxAlternatives = 1

    reconocimiento.onstart = () => {
      setEscuchando(true)
      setTextoVoz('Escuchando...')
      setRespuestaIA('')
    }

    reconocimiento.onresult = async (event) => {
      const texto =
        event.results[0][0].transcript

      setTextoVoz(texto)

      await enviarMensajeIA(texto)
    }

    reconocimiento.onerror = (event) => {
      console.error(
        'Error de reconocimiento de voz:',
        event.error,
      )

      if (event.error === 'not-allowed') {
        setError(
          'Debes permitir el acceso al micrófono en el navegador.',
        )
      } else if (event.error === 'no-speech') {
        setError(
          'No detecté ninguna voz. Intenta nuevamente.',
        )
      } else {
        setError(
          `Error de reconocimiento de voz: ${event.error}`,
        )
      }

      setEscuchando(false)
    }

    reconocimiento.onend = () => {
      setEscuchando(false)
      reconocimientoRef.current = null
    }

    reconocimientoRef.current = reconocimiento

    reconocimiento.start()
  }

  // ------------------------------------------
  // DETENER VOZ
  // ------------------------------------------

  function detenerVoz() {
    reconocimientoRef.current?.stop()

    setEscuchando(false)
  }

  // ------------------------------------------
  // LIMPIAR VOZ AL SALIR
  // ------------------------------------------

  useEffect(() => {
    return () => {
      reconocimientoRef.current?.stop()

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const slots =
    disponibilidad?.profesionales?.[0]?.slots ?? []

  return (
    <AppShell header={{ height: 64 }} padding="md">

      <AppShell.Header>
        <Group
          h="100%"
          px="md"
          justify="space-between"
        >
          <Text fw={700}>
            Citas médicas
          </Text>

          <Group gap="sm">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="default">
                  Iniciar sesión
                </Button>
              </SignInButton>

              <SignUpButton mode="modal">
                <Button>
                  Registrarse
                </Button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <UserButton />
            </Show>
          </Group>
        </Group>
      </AppShell.Header>


      <AppShell.Main>

        <Stack
          maw={720}
          mx="auto"
          mt="xl"
          gap="xl"
        >

          {/* ---------------------------------- */}
          {/* ASISTENTE DE VOZ */}
          {/* ---------------------------------- */}

          <Stack
            p="lg"
            style={{
              border: '1px solid #ddd',
              borderRadius: '12px',
            }}
          >

            <Title order={2}>
              🤖 Asistente médico
            </Title>

            <Text c="dimmed">
              Puedes preguntarme por especialidades,
              médicos o disponibilidad de citas.
            </Text>


            <Group>

              <Button
                size="lg"
                onClick={
                  escuchando
                    ? detenerVoz
                    : iniciarVoz
                }
                color={
                  escuchando
                    ? 'red'
                    : 'blue'
                }
              >
                {escuchando
                  ? '⏹️ Detener'
                  : '🎤 Hablar'}
              </Button>


              {procesandoVoz ? (
                <Text c="blue">
                  🤔 Consultando...
                </Text>
              ) : null}

            </Group>


            {textoVoz ? (
              <Stack gap={4}>
                <Text fw={600}>
                  Tú dijiste:
                </Text>

                <Text>
                  {textoVoz}
                </Text>
              </Stack>
            ) : null}


            {respuestaIA ? (
              <Stack gap={4}>
                <Text fw={600}>
                  Asistente:
                </Text>

                <Text>
                  {respuestaIA}
                </Text>
              </Stack>
            ) : null}

          </Stack>


          {/* ---------------------------------- */}
          {/* AGENDA */}
          {/* ---------------------------------- */}

          <Title order={2}>
            Agenda
          </Title>


          <TextInput
            type="date"
            label="Fecha"
            value={fecha}
            onChange={(event) =>
              setFecha(
                event.currentTarget.value,
              )
            }
          />


          <DayView
            date={fecha}
            events={events}
            locale="es"
            startTime="08:00:00"
            endTime="18:00:00"
            h={560}
            labels={{
              today: 'Hoy',
              allDay: 'Todo el día',
              next: 'Siguiente',
              previous: 'Anterior',
              day: 'Día',
              week: 'Semana',
              month: 'Mes',
              year: 'Año',
            }}
          />


          {/* ---------------------------------- */}
          {/* CITAS DEL DÍA */}
          {/* ---------------------------------- */}

          <Title order={3}>
            Citas del día
          </Title>


          {citas.length === 0 ? (
            <Text c="dimmed">
              No hay citas para esta fecha.
            </Text>
          ) : (
            citas.map((cita) => (
              <Group
                key={cita.id}
                justify="space-between"
                align="flex-start"
              >

                <Text size="sm">
                  {String(
                    cita.hora_inicio,
                  ).slice(0, 5)}{' '}
                  ·{' '}
                  {nombreCompleto(
                    cita.pacientes,
                  )}{' '}
                  con{' '}
                  {nombreCompleto(
                    cita.profesionales,
                  )}{' '}
                  ({cita.estado})
                </Text>


                {cita.estado === 'programada' ||
                cita.estado === 'confirmada' ? (
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    onClick={() =>
                      cancelarCita(cita.id)
                    }
                  >
                    Cancelar
                  </Button>
                ) : null}

              </Group>
            ))
          )}


          {/* ---------------------------------- */}
          {/* DISPONIBILIDAD */}
          {/* ---------------------------------- */}

          <form
            onSubmit={consultarDisponibilidad}
          >

            <Stack>

              <Title order={3}>
                Disponibilidad del especialista
              </Title>


              <NativeSelect
                label="Profesional"
                value={profesionalConsulta}
                onChange={(event) =>
                  setProfesionalConsulta(
                    event.currentTarget.value,
                  )
                }
                data={profesionales.map(
                  (item) => ({
                    value: item.id,
                    label:
                      nombreCompleto(item),
                  }),
                )}
              />


              <Button type="submit">
                Consultar horarios libres
              </Button>


              {slots.map((slot) => (
                <Text
                  key={`${slot.horaInicio}-${slot.horaFin}`}
                  size="sm"
                  c={
                    slot.disponible
                      ? undefined
                      : 'dimmed'
                  }
                >
                  {slot.horaInicio} -{' '}
                  {slot.horaFin} ·{' '}
                  {slot.disponible
                    ? 'Libre'
                    : 'Ocupado'}
                </Text>
              ))}

            </Stack>

          </form>


          {/* ---------------------------------- */}
          {/* AGENDAR CITA */}
          {/* ---------------------------------- */}

          <form onSubmit={agendarCita}>

            <Stack>

              <Title order={3}>
                Agendar cita
              </Title>


              <NativeSelect
                label="Paciente"
                value={pacienteId}
                onChange={(event) =>
                  setPacienteId(
                    event.currentTarget.value,
                  )
                }
                data={pacientes.map(
                  (item) => ({
                    value: item.id,
                    label:
                      nombreCompleto(item),
                  }),
                )}
              />


              <NativeSelect
                label="Profesional"
                value={profesionalId}
                onChange={(event) =>
                  setProfesionalId(
                    event.currentTarget.value,
                  )
                }
                data={profesionales.map(
                  (item) => ({
                    value: item.id,
                    label:
                      nombreCompleto(item),
                  }),
                )}
              />


              <NativeSelect
                label="Especialidad"
                value={especialidadId}
                onChange={(event) =>
                  setEspecialidadId(
                    event.currentTarget.value,
                  )
                }
                data={especialidades.map(
                  (item) => ({
                    value: item.id,
                    label: item.nombre,
                  }),
                )}
              />


              <TextInput
                label="Hora de inicio"
                type="time"
                value={horaInicio}
                onChange={(event) =>
                  setHoraInicio(
                    event.currentTarget.value,
                  )
                }
                required
              />


              <TextInput
                label="Motivo"
                value={motivo}
                onChange={(event) =>
                  setMotivo(
                    event.currentTarget.value,
                  )
                }
              />


              <Button type="submit">
                Agendar
              </Button>

            </Stack>

          </form>


          {/* ---------------------------------- */}
          {/* MENSAJES */}
          {/* ---------------------------------- */}

          {mensaje ? (
            <Text c="teal">
              {mensaje}
            </Text>
          ) : null}


          {error ? (
            <Text c="red">
              {error}
            </Text>
          ) : null}

        </Stack>

      </AppShell.Main>

    </AppShell>
  )
}

export default App