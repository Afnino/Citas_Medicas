# Citas Medicas — Gestion y programacion de citas

API REST (con una pagina de asistente de voz) para consultar medicos, especialidades y
horarios, **agendar y cancelar citas**, ver la agenda y hacer todo eso tambien **hablando**
con un asistente con IA.

Este proyecto se construyo tomando como modelo directo la *Plataforma de Educacion
Financiera*: misma arquitectura hexagonal, misma estructura de carpetas, mismo estilo de
codigo. Cambia el dominio (educacion financiera → citas medicas) y se agrega el asistente.

## Tecnologias

- **Node.js >= 20 + TypeScript + Express** (ES Modules)
- **PostgreSQL** con **TypeORM** + `pg` (`synchronize` activo, sin migraciones)
- **JWT** (`jsonwebtoken`) para autenticacion y **bcryptjs** para el hash de contrasenas
- **Joi** para validar variables de entorno y datos de entrada
- **API de Anthropic (opcional)** para el asistente, via `fetch` nativo (sin libreria extra)
- Pagina estatica accesible en `public/` con **Web Speech API** del navegador (voz)

> Nota sobre la base de datos: se pidio "MySQL → PostgreSQL", pero el Archivo 1 ya usaba
> PostgreSQL + TypeORM. Por eso la persistencia se replico tal cual (mismo `DataSource`,
> mismo patron de adaptadores) y no hubo que "traducir" nada desde MySQL.

## Arquitectura (hexagonal / puertos y adaptadores)

```
src/
├── domain/              # Modelos de dominio y PUERTOS (interfaces)
│   ├── User.ts / UserPort.ts
│   ├── Specialty.ts / SpecialtyPort.ts
│   ├── Doctor.ts / DoctorPort.ts          # medico + horario semanal
│   ├── Appointment.ts / AppointmentPort.ts
│   └── Assistant.ts / AssistantPort.ts    # puerto de la IA (interpretar frases)
├── application/         # Casos de uso / logica de negocio (no conocen Express ni TypeORM)
│   ├── AuthApplication.ts                 # emision/verificacion de JWT
│   ├── UserApplication.ts
│   ├── SpecialtyApplication.ts
│   ├── DoctorApplication.ts
│   ├── AvailabilityApplication.ts         # calcula horarios libres
│   ├── AppointmentApplication.ts          # agendar, cancelar, consultar, agenda
│   └── AssistantApplication.ts            # ejecuta lo que el asistente interpreto
├── shared/
│   ├── ApiError.ts      # error con codigo HTTP, comun a las capas
│   └── dates.ts         # utilidades de fecha/hora (texto YYYY-MM-DD y HH:MM)
└── infraestructure/
    ├── adapter/         # ADAPTADORES: implementan los puertos
    │   ├── UserAdapter / SpecialtyAdapter / DoctorAdapter / AppointmentAdapter   (TypeORM)
    │   └── RulesAssistantAdapter / AnthropicAssistantAdapter                      (IA)
    ├── config/          # environment-vars (Joi) y data-base (DataSource + conexion)
    ├── controller/      # Controladores HTTP delgados (lanzan ApiError)
    ├── entities/        # Entidades TypeORM (tablas)
    ├── routes/          # Rutas Express (ensamblan adaptador → aplicacion → controlador)
    ├── util/            # Validaciones Joi
    ├── web/             # app.ts, authMiddleware.ts, http.ts (asyncHandler + errorHandler)
    └── bootstrap/       # Arranque del servidor HTTP
```

**Flujo de una peticion**

`cliente → ruta Express → authenticateToken → controlador (valida con Joi) → application
(reglas de negocio) → puerto (interfaz) → adaptador TypeORM → PostgreSQL`

Si algo falla, se lanza un `ApiError`; `asyncHandler` lo entrega al `errorHandler` central,
que lo convierte en la respuesta HTTP. La dependencia siempre apunta hacia adentro: el
dominio y la aplicacion no importan nada de `infraestructure` (salvo `environment-vars`, igual
que en el Archivo 1).

**Asistente de voz/IA y la arquitectura.** `AssistantApplication` depende solo de
`AssistantPort`. Quien interpreta la frase es un adaptador intercambiable:
`RulesAssistantAdapter` (reglas locales, por defecto, sin claves ni red) o
`AnthropicAssistantAdapter` (modelo de IA; si falla, cae al de reglas). Cambiar de proveedor
no toca la logica de negocio. La voz (microfono y lectura en voz alta) ocurre en el
navegador; el servidor recibe **texto** y devuelve `reply` (para mostrar) y `speech`
(para leer en voz alta).

## Estructura de la base de datos

Esquema `citas` (se crea solo al arrancar). Tablas: `user`, `specialty`, `doctor`,
`doctor_schedule` (dias y horas de atencion + duracion de cada cita) y `appointment`.
Un indice unico parcial `(doctor_id, appointment_date, appointment_time) WHERE status =
'scheduled'` impide que dos personas tomen el mismo horario aunque lleguen a la vez; una
cita cancelada libera el horario.

Al primer arranque se siembran 5 especialidades, 7 medicos y sus horarios (`seedIfEmpty`).

## Instalacion y configuracion

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env     # y edita los valores

# 3. Desarrollo (recarga en caliente)
npm run dev

# 4. Produccion
npm run build
npm start
```

Requisitos: Node.js >= 20 y PostgreSQL en marcha con una base de datos vacia creada
(por defecto `citas_medicas`: `CREATE DATABASE citas_medicas;`).

| Variable | Descripcion | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `4000` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `TIMEZONE` | Zona horaria para saber que es "hoy" y que horas ya pasaron | `America/Bogota` |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | Conexion PostgreSQL | puerto `5432` |
| `JWT_SECRET` | Secreto del token (obligatorio, >= 16 caracteres) | — |
| `JWT_EXPIRES_IN` | Vigencia del token | `30m` |
| `DEMO_LOGIN_ENABLED` | Habilita `/api/demo-login` | `true` |
| `DEMO_EMAIL` `DEMO_PASSWORD` | Usuario demo compartido | `demo@demo.local` / `Demo1234` |
| `ASSISTANT_PROVIDER` | `rules` o `anthropic` | `rules` |
| `ANTHROPIC_API_KEY` `ANTHROPIC_MODEL` | Solo si usas `anthropic` | — / `claude-sonnet-5-5` |

El `.env` esta en `.gitignore`. No subas secretos reales.

## Conexion a PostgreSQL y levantamiento del servidor

- `src/infraestructure/config/data-base.ts` define el `DataSource` de TypeORM
  (`type: "postgres"`, esquema `citas`) con los datos del `.env`. `connectDB()` primero
  ejecuta `CREATE SCHEMA IF NOT EXISTS` con `pg` (TypeORM crea tablas, no esquemas) y luego
  inicializa el `DataSource`, que sincroniza las tablas.
- `src/index.ts` ejecuta en orden: **conectar BD → sembrar datos → levantar servidor**.
  `ServerBootstrap` crea el servidor HTTP con `http.createServer(app)` y escucha en `PORT`.
  Si todo va bien veras:

```
Conectado a la base de datos PostgreSQL
Server running at http://localhost:4000
```

- **Comprobar la conexion:** `GET http://localhost:4000/api/health` →
  `{"status":"ok","database":"connected"}` (ejecuta un `SELECT 1`; si la BD cae responde 500).
- **Asistente por voz:** abre `http://localhost:4000/`, pulsa *Entrar como invitado* y usa el
  microfono (Chrome/Edge) o escribe.

## Promises y async/await (explicado con el codigo del proyecto)

**Que es una operacion asincrona.** Hablar con la base de datos o con un servicio externo
tarda (milisegundos o segundos). Si el programa se quedara esperando sin hacer nada, el
servidor no podria atender a nadie mas. Node.js no espera: *inicia* la operacion y sigue
trabajando; cuando termina, avisa.

**Que es una Promise.** Es un objeto que representa un resultado que *todavia no existe pero
existira*. Tiene tres estados: *pendiente*, *cumplida* (`resolve`, con el valor) o
*rechazada* (`reject`, con un error). Resuelve el problema de "como recibo un resultado que
llega despues" sin anidar callbacks.

**async / await.** Es la forma comoda de usar Promises: `async` marca una funcion que
siempre devuelve una Promise, y `await` pausa *solo esa funcion* hasta que la Promise se
cumple (sin bloquear el servidor); si se rechaza, `await` lanza el error y se captura con
`try/catch`. Por eso en los puertos todo es `Promise<...>`:

```ts
// domain/AppointmentPort.ts
getAppointmentById(id:number):Promise<Appointment| null>;
```

**Donde se usa en este proyecto**

| Operacion | Archivo | Como |
|---|---|---|
| Conexion a la BD | `config/data-base.ts` | `await AppDataSource.initialize()` |
| Consultas | `adapter/DoctorAdapter.ts` | `await this.doctorRepository.find(...)` |
| Insercion | `adapter/AppointmentAdapter.ts` | `await ...save(...)` al agendar |
| Actualizacion | `adapter/AppointmentAdapter.ts` | cancelar = `save` con `status = "cancelled"` |
| Eliminacion logica | `adapter/UserAdapter.ts` | baja = `status_user = 0` |
| Llamada a servicio externo | `adapter/AnthropicAssistantAdapter.ts` | `await fetch(...)` a la API de IA |
| Arranque del servidor | `bootstrap/server.bootstrap.ts` | `new Promise((resolve, reject) => ...)`: se cumple cuando el servidor emite `listening` y se rechaza si emite `error` |
| Errores en rutas | `web/http.ts` | `asyncHandler` hace `fn(...).catch(next)`: una Promise rechazada llega al `errorHandler` |

**Promise.all (en paralelo).** Cuando varias consultas no dependen entre si, se lanzan juntas
y se espera a todas, en vez de una tras otra. Ejemplo real, `AvailabilityApplication`:

```ts
const [schedules, booked] = await Promise.all([
    this.doctorPort.getSchedulesByDoctor(doctor.id, dayOfWeek(date)),   // horario del dia
    this.appointmentPort.getAppointmentsByDoctor(doctor.id, date, date, true), // citas ya tomadas
]);
```

Lo mismo para consultar la disponibilidad de todos los medicos de una especialidad.

## Endpoints

Todos bajo `/api`. Los marcados con 🔒 requieren `Authorization: Bearer <token>`.

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/health` | Estado del servicio y de la conexion a PostgreSQL |
| `POST` | `/users` | Registro (nombre, email, contrasena con mayuscula y numero) |
| `POST` | `/login` | Login → `{ token }` |
| `POST` | `/demo-login` | Acceso de invitado → `{ token }` |
| `GET` | `/specialties` 🔒 | Lista de especialidades |
| `POST` | `/specialties` 🔒 admin | Crea especialidad |
| `GET` | `/doctors?specialtyId=` 🔒 | Lista de medicos (filtro opcional) |
| `GET` | `/doctors/:id` 🔒 | Detalle de un medico |
| `POST` | `/doctors` 🔒 admin | Crea medico (`name`, `specialtyId`) |
| `GET` / `POST` | `/doctors/:id/schedules` 🔒 (POST admin) | Ver / agregar horario semanal (`dayOfWeek` 0-6, `startTime`, `endTime`, `slotMinutes`) |
| `GET` | `/doctors/:id/availability?date=YYYY-MM-DD` 🔒 | Horarios libres de un medico |
| `GET` | `/availability?date=YYYY-MM-DD&specialtyId=` 🔒 | Medicos con horarios libres ese dia |
| `POST` | `/appointments` 🔒 | Agenda cita (`doctorId`, `date`, `time`, `reason`) |
| `GET` | `/appointments` 🔒 | Mis citas (incluye canceladas) |
| `GET` | `/appointments/:id` 🔒 | Detalle de una cita propia |
| `POST` | `/appointments/:id/cancel` 🔒 | Cancela una cita propia |
| `GET` | `/agenda?from=&to=` 🔒 | Mi agenda: citas programadas agrupadas por dia |
| `GET` | `/doctors/:id/agenda?from=&to=` 🔒 admin | Agenda de un medico |
| `POST` | `/assistant` 🔒 | Asistente: `{ message, context? }` → `{ reply, speech, intent, context, options? }` |
| `GET` | `/users`, `/users/email/:email` 🔒 admin | Consulta de usuarios |

Para volver admin a un usuario:

```sql
UPDATE citas."user" SET role_user = 'admin' WHERE email_user = 'tu_correo@ejemplo.com';
```

(cierra sesion y vuelve a entrar para que el token incluya el rol).

## Reglas de negocio

- Solo se agenda un horario que este dentro del horario del medico, no este tomado y no haya pasado (segun `TIMEZONE`).
- Dos personas no pueden tomar el mismo horario: se valida en `AvailabilityApplication` y lo garantiza el indice unico de PostgreSQL (la segunda recibe `409`).
- Cancelar cambia el estado a `cancelled` (se conserva el historial) y libera el horario.
- Un usuario solo ve y cancela **sus** citas; ante una cita ajena la respuesta es `404`. El admin puede ver/cancelar cualquiera.
- Los horarios se generan a partir de `doctor_schedule`: cada bloque se divide en citas de `slotMinutes`.

## Asistente de voz / IA

Frases que entiende (con el interprete por reglas; con IA entiende mas variantes):

- "Quiero una cita con dermatologia" → propone los 5 horarios mas proximos; dices "la segunda" y confirmas con "si".
- "¿Que medicos tienen disponibilidad manana?" · "¿Que especialidades hay?" · "Medicos de cardiologia"
- "Quiero cita con la doctora Rojas el lunes a las 10" → pasa directo a confirmar.
- "¿Que citas tengo?" · "Quiero cancelar mi cita" (pide el numero si hay varias y confirma).

Diseno seguro:
- **Agendar y cancelar siempre piden confirmacion** ("Responde si o no").
- El `context` lo guarda el cliente, asi que el servidor **no confia en el**: al confirmar se vuelve a validar disponibilidad y pertenencia de la cita.
- La salida del modelo de IA se valida campo por campo; si la IA falla se usa el interprete local.
- Para activar la IA: `ASSISTANT_PROVIDER=anthropic` y `ANTHROPIC_API_KEY=...`.

## Accesibilidad

La pagina `public/index.html`:
- HTML semantico (`main`, `header`, `label` asociado a cada campo, enlace "saltar al mensaje").
- Region `role="log"` con `aria-live`: los lectores de pantalla anuncian cada respuesta nueva; el estado se anuncia con `role="status"`.
- El boton del microfono usa `aria-pressed` y cambia su texto ("Escuchando..."), sin depender del color.
- Mensajes con prefijo de texto ("Tu:" / "Asistente:") y borde distinto, no solo color; contraste alto y modo oscuro automatico.
- Todo se maneja con teclado (Tab, Enter) con foco visible; las opciones del asistente se leen como lista numerada.
- Voz de entrada (dictado) y de salida (lectura en voz alta, desactivable). Si el navegador no soporta dictado, se puede escribir.
- Las respuestas del asistente son frases cortas con fecha dicha en palabras ("lunes 5 de octubre a las 10:00").

## Relacion con el Archivo 1 (que se replico y que cambio)

| Archivo 1 (educacion financiera) | Citas medicas |
|---|---|
| `domain/User(+Port)` | igual (pacientes y admin) + `Specialty`, `Doctor`, `Appointment`, `Assistant` con sus puertos |
| `application/UserApplication`, `AuthApplication` | igual (sin recuperacion de contrasena) + una Application por caso de uso |
| `adapter/UserAdapter` (TypeORM) | igual + un adaptador por puerto con el mismo `toDomain` / `try-catch` / `Error` |
| `ModuleRepository.seedIfEmpty` | `SpecialtyAdapter` y `DoctorAdapter.seedIfEmpty` |
| `controller/UserController` + rutas inline | `UserController`, `CatalogController`, `AppointmentController`, `AssistantController` |
| `routes/UserRoutes` | `UserRoutes`, `CatalogRoutes`, `AppointmentRoutes`, `AssistantRoutes` |
| `web/app.ts`, `http.ts`, `authMiddleware.ts`, `bootstrap/server.bootstrap.ts`, `ApiError.ts` | **sin cambios** |
| `environment-vars.ts` (Joi) | mismo patron; se quitan SMTP/reset y se agregan `TIMEZONE` y variables del asistente |
| `mailer.ts`, recuperacion de contrasena, foro, modulos, progreso | no aplican al dominio y se retiraron |

Diferencias deliberadas: (1) los repositorios nuevos implementan un puerto (`*Adapter`), como
`UserAdapter`, en lugar de ser clases sueltas como `ModuleRepository`; (2) se crea el esquema
`citas` con `pg` antes de sincronizar (TypeORM crea tablas pero no esquemas; fallaba con `schema "citas" does not exist` al probarlo);
(3) se agrego `GET /api/health`.

## Scripts

| Script | Accion |
|---|---|
| `npm run dev` | Desarrollo con recarga (`tsx watch`) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta `dist/index.js` |
| `npm run typecheck` | `tsc --noEmit` |

## Pruebas manuales realizadas

Contra PostgreSQL 16 real: arranque y `/health`; registro, login y rol admin; catalogo;
disponibilidad (descuenta citas tomadas y horas pasadas); agendar, horario ocupado (`409`),
horario fuera de agenda (`409`), validaciones (`400`); cancelar, doble cancelacion (`409`) y
reagendar el horario liberado; cita ajena (`404`); 3 reservas simultaneas del mismo horario
(1 × `201`, 2 × `409`); y un dialogo completo con el asistente (agendar con confirmacion,
consultar, cancelar con confirmacion, preguntas aclaratorias y frases no entendidas).
