import { useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'
import { AppShell, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { DayView } from '@mantine/schedule'

const today = dayjs().format('YYYY-MM-DD')

const events = [
  {
    id: 1,
    title: 'Reunión de equipo',
    start: `${today} 09:00:00`,
    end: `${today} 09:30:00`,
    color: 'blue',
  },
  {
    id: 2,
    title: 'Revisión de código',
    start: `${today} 11:00:00`,
    end: `${today} 12:00:00`,
    color: 'violet',
  },
  {
    id: 3,
    title: 'Almuerzo',
    start: `${today} 13:00:00`,
    end: `${today} 14:00:00`,
    color: 'orange',
  },
  {
    id: 4,
    title: 'Llamada con cliente',
    start: `${today} 15:30:00`,
    end: `${today} 16:30:00`,
    color: 'cyan',
  },
]

function App() {
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setEmail('')
    setError('')

    const response = await fetch(
      `${import.meta.env.SERVER_URL}/email?userId=${encodeURIComponent(userId)}`,
    )
    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'No se pudo obtener el email')
      return
    }

    setEmail(data.email)
  }

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={700}>Demo</Text>
          <Group gap="sm">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="default">Iniciar sesión</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Registrarse</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Stack maw={720} mx="auto" mt="xl" gap="xl">
          <Title order={2}>Inicio</Title>
          <DayView
            date={today}
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
          <form onSubmit={handleSubmit}>
            <Stack maw={360}>
              <TextInput
                label="ID de usuario"
                value={userId}
                onChange={(event) => setUserId(event.currentTarget.value)}
                required
              />
              <Button type="submit">Enviar</Button>
              {email ? <Text>{email}</Text> : null}
              {error ? <Text c="red">{error}</Text> : null}
            </Stack>
          </form>
        </Stack>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
