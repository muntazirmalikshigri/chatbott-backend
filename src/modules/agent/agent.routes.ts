import { Router } from 'express'
import agentController from './agent.controller'
import authenticate from '../../middlewares/authenticate'

const router = Router()

router.post('/companies/:companyId/agents', authenticate, agentController.createAgent)
router.get('/companies/:companyId/agents', authenticate, agentController.listAgentsByCompany)
router.get('/agents/:agentId', authenticate, agentController.getAgentById)
router.patch('/agents/:agentId', authenticate, agentController.updateAgent)
router.delete('/agents/:agentId', authenticate, agentController.deleteAgent)

export default router
