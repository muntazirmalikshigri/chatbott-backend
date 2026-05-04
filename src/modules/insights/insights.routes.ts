import { Router } from 'express'
import insightsController from './insights.controller'
import authenticate from '../../middlewares/authenticate'

const router = Router()

// GET /v1/companies/:companyId/insights
router.get('/:companyId/insights', authenticate, insightsController.getInsights)

export default router