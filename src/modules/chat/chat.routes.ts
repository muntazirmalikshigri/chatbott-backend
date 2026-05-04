import { Router } from 'express'
import chatController from './chat.controller'

const router = Router()

router.post('/chat/:agentId', chatController.chat)

export default router
