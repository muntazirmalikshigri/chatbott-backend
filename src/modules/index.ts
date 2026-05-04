
// import { Router } from 'express'
// import companyRoutes from './company/company.routes'
// import agentRoutes from './agent/agent.routes'
// import knowledgeRoutes from './knowledge/knowledge.routes'
// import chatRoutes from './chat/chat.routes'
// import whatsappRoutes from './whatsapp/whatsapp.routes'
// import insightsRoutes from './insights/insights.routes'

// const router = Router()

// router.use('/companies', companyRoutes)
// router.use('/', agentRoutes)
// router.use('/', knowledgeRoutes)
// router.use('/', chatRoutes)
// router.use('/whatsapp', whatsappRoutes)
// router.use('/companies', insightsRoutes)

// export default router




import { Router } from 'express'
import companyRoutes from './company/company.routes'
import agentRoutes from './agent/agent.routes'
import knowledgeRoutes from './knowledge/knowledge.routes'
import chatRoutes from './chat/chat.routes'
import whatsappRoutes from './whatsapp/whatsapp.routes'
import insightsRoutes from './insights/insights.routes'

const router = Router()

router.use('/companies', companyRoutes)
router.use('/', agentRoutes)
router.use('/', knowledgeRoutes)
router.use('/', chatRoutes)
router.use('/whatsapp', whatsappRoutes)
router.use('/companies', insightsRoutes)

export default router