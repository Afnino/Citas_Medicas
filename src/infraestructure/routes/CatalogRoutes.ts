import { Router } from 'express'
import { SpecialtyApplication } from '../../application/SpecialtyApplication.js'
import { DoctorApplication } from '../../application/DoctorApplication.js'
import { AvailabilityApplication } from '../../application/AvailabilityApplication.js'
import { SpecialtyAdapter } from '../adapter/SpecialtyAdapter.js'
import { DoctorAdapter } from '../adapter/DoctorAdapter.js'
import { AppointmentAdapter } from '../adapter/AppointmentAdapter.js'
import { CatalogController } from '../controller/CatalogController.js'
import { authenticateToken, authorizeRole } from '../web/authMiddleware.js'
import { asyncHandler } from '../web/http.js'

const router = Router()

// Inicializacion de las capas
const specialtyAdapter = new SpecialtyAdapter()
const doctorAdapter = new DoctorAdapter()
const appointmentAdapter = new AppointmentAdapter()
const specialtyApp = new SpecialtyApplication(specialtyAdapter)
const doctorApp = new DoctorApplication(doctorAdapter, specialtyAdapter)
const availabilityApp = new AvailabilityApplication(doctorAdapter, appointmentAdapter)
const catalogController = new CatalogController(specialtyApp, doctorApp, availabilityApp)

// --- Especialidades ---
router.get('/specialties', authenticateToken, asyncHandler((req, res) => catalogController.getAllSpecialties(req, res)))
router.post('/specialties', authenticateToken, authorizeRole(['admin']), asyncHandler((req, res) => catalogController.createSpecialty(req, res)))

// --- Medicos ---
router.get('/doctors', authenticateToken, asyncHandler((req, res) => catalogController.getAllDoctors(req, res)))
router.get('/doctors/:id', authenticateToken, asyncHandler((req, res) => catalogController.getDoctorById(req, res)))
router.post('/doctors', authenticateToken, authorizeRole(['admin']), asyncHandler((req, res) => catalogController.createDoctor(req, res)))
router.get('/doctors/:id/schedules', authenticateToken, asyncHandler((req, res) => catalogController.getSchedules(req, res)))
router.post('/doctors/:id/schedules', authenticateToken, authorizeRole(['admin']), asyncHandler((req, res) => catalogController.addSchedule(req, res)))

// --- Disponibilidad ---
router.get('/doctors/:id/availability', authenticateToken, asyncHandler((req, res) => catalogController.getDoctorAvailability(req, res)))
router.get('/availability', authenticateToken, asyncHandler((req, res) => catalogController.getAvailability(req, res)))

export default router
