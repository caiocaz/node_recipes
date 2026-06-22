import express from 'express'
import AuthController from '../controllers/AuthController.js'
import UserController from '../controllers/UserController.js'

const router = express.Router()

router.get('/login', AuthController.login)
router.post('/login', AuthController.loginPost)
router.get('/logout', AuthController.logout)

router.get('/register', UserController.register)
router.post('/register', UserController.save)

export default router
