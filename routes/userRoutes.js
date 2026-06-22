import express from 'express'
import UserController from '../controllers/UserController.js'
import checkAuth from '../middlewares/authMiddleware.js'

const router = express.Router()

router.get('/profile', checkAuth, UserController.profile)
router.get('/profile/edit', checkAuth, UserController.edit)
router.post('/profile/edit', checkAuth, UserController.update)
router.post('/profile/delete', checkAuth, UserController.delete)

export default router
