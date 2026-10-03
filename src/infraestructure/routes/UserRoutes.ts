import { Router } from 'express'
import { UserApplication } from '../../application/UserApplication.js'
import { UserAdapter } from '../adapter/UserAdapter.js'
import { UserController } from '../controller/UserController.js'
import { authenticateToken, authorizeRole } from '../web/authMiddleware.js'
import { asyncHandler } from '../web/http.js'
import { checkDB } from '../config/data-base.js'

const router = Router()

// Inicializacion de las capas
const userAdapter = new UserAdapter()
const userApp = new UserApplication(userAdapter)
const userController = new UserController(userApp)

// --- Estado del servicio y de la conexion a PostgreSQL ---
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await checkDB()
    res.json({ status: 'ok', database: 'connected' })
  })
)

// --- Auth ---
router.post('/login', asyncHandler((req, res) => userController.login(req, res)))
router.post('/demo-login', asyncHandler((req, res) => userController.demoLogin(req, res)))
router.post('/users', asyncHandler((req, res) => userController.createUser(req, res)))

// --- Usuarios (solo admin) ---
router.get(
  '/users',
  authenticateToken,
  authorizeRole(['admin']),
  asyncHandler((req, res) => userController.getAllUsers(req, res))
)

router.get(
  '/users/email/:email',
  authenticateToken,
  authorizeRole(['admin']),
  asyncHandler((req, res) => userController.getUserByEmail(req, res))
)

export default router
