import { Router } from 'express'
import { AssistantApplication } from '../../application/AssistantApplication.js'
import { AppointmentApplication } from '../../application/AppointmentApplication.js'
import { AvailabilityApplication } from '../../application/AvailabilityApplication.js'
import { DoctorApplication } from '../../application/DoctorApplication.js'
import { SpecialtyApplication } from '../../application/SpecialtyApplication.js'
import { AssistantPort } from '../../domain/AssistantPort.js'
import { AppointmentAdapter } from '../adapter/AppointmentAdapter.js'
import { DoctorAdapter } from '../adapter/DoctorAdapter.js'
import { SpecialtyAdapter } from '../adapter/SpecialtyAdapter.js'
import { RulesAssistantAdapter } from '../adapter/RulesAssistantAdapter.js'
import { AnthropicAssistantAdapter } from '../adapter/AnthropicAssistantAdapter.js'
import { AssistantController } from '../controller/AssistantController.js'
import envs from '../config/environment-vars.js'
import { authenticateToken } from '../web/authMiddleware.js'
import { asyncHandler } from '../web/http.js'

const router = Router()

// Inicializacion de las capas
const appointmentAdapter = new AppointmentAdapter()
const doctorAdapter = new DoctorAdapter()
const specialtyAdapter = new SpecialtyAdapter()
const specialtyApp = new SpecialtyApplication(specialtyAdapter)
const doctorApp = new DoctorApplication(doctorAdapter, specialtyAdapter)
const availabilityApp = new AvailabilityApplication(doctorAdapter, appointmentAdapter)
const appointmentApp = new AppointmentApplication(appointmentAdapter, doctorAdapter, specialtyAdapter, availabilityApp)

// El proveedor de IA se elige por configuracion; la aplicacion solo conoce el puerto.
const rulesAdapter = new RulesAssistantAdapter()
const assistantAdapter: AssistantPort =
  envs.ASSISTANT_PROVIDER === 'anthropic' && envs.ANTHROPIC_API_KEY
    ? new AnthropicAssistantAdapter(rulesAdapter)
    : rulesAdapter

const assistantApp = new AssistantApplication(assistantAdapter, specialtyApp, doctorApp, availabilityApp, appointmentApp)
const assistantController = new AssistantController(assistantApp)

// --- Asistente de voz / IA ---
router.post('/assistant', authenticateToken, asyncHandler((req, res) => assistantController.talk(req, res)))

export default router
