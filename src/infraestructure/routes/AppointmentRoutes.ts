import { Router } from 'express'
import { AppointmentApplication } from '../../application/AppointmentApplication.js'
import { AvailabilityApplication } from '../../application/AvailabilityApplication.js'
import { AppointmentAdapter } from '../adapter/AppointmentAdapter.js'
import { DoctorAdapter } from '../adapter/DoctorAdapter.js'
import { SpecialtyAdapter } from '../adapter/SpecialtyAdapter.js'
import { AppointmentController } from '../controller/AppointmentController.js'
import { authenticateToken, authorizeRole } from '../web/authMiddleware.js'
import { asyncHandler } from '../web/http.js'

const router = Router()

// Inicializacion de las capas
const appointmentAdapter = new AppointmentAdapter()
const doctorAdapter = new DoctorAdapter()
const specialtyAdapter = new SpecialtyAdapter()
const availabilityApp = new AvailabilityApplication(doctorAdapter, appointmentAdapter)
const appointmentApp = new AppointmentApplication(appointmentAdapter, doctorAdapter, specialtyAdapter, availabilityApp)
const appointmentController = new AppointmentController(appointmentApp)

// --- Citas (del usuario autenticado) ---
router.post('/appointments', authenticateToken, asyncHandler((req, res) => appointmentController.bookAppointment(req, res)))
router.get('/appointments', authenticateToken, asyncHandler((req, res) => appointmentController.getMyAppointments(req, res)))
router.get('/appointments/:id', authenticateToken, asyncHandler((req, res) => appointmentController.getAppointmentById(req, res)))
router.post('/appointments/:id/cancel', authenticateToken, asyncHandler((req, res) => appointmentController.cancelAppointment(req, res)))

// --- Agenda ---
router.get('/agenda', authenticateToken, asyncHandler((req, res) => appointmentController.getAgenda(req, res)))
router.get(
  '/doctors/:id/agenda',
  authenticateToken,
  authorizeRole(['admin']),
  asyncHandler((req, res) => appointmentController.getDoctorAgenda(req, res))
)

export default router
