// import { Router, raw } from 'express'
// import knowledgeController from './knowledge.controller'
// import authenticate from '../../middlewares/authenticate'

// const router = Router()

// router.post('/agents/:agentId/knowledge/text', authenticate, knowledgeController.uploadTextKnowledge)

// router.post(
//     '/upload-pdf',
//     authenticate,
//     raw({
//         type: ['application/pdf', 'application/octet-stream'],
//         limit: '25mb'
//     }),
//     knowledgeController.uploadPdfKnowledge
// )

// router.post(
//     '/agents/:agentId/knowledge/pdf',
//     authenticate,
//     raw({
//         type: ['application/pdf', 'application/octet-stream'],
//         limit: '25mb'
//     }),
//     knowledgeController.uploadPdfKnowledge
// )

// router.get('/agents/:agentId/knowledge', authenticate, knowledgeController.listKnowledgeByAgent)

// // Delete a single knowledge chunk
// router.delete('/agents/:agentId/knowledge/:chunkId', authenticate, knowledgeController.deleteKnowledgeChunk)

// export default router




import { Router, raw } from 'express'
import knowledgeController from './knowledge.controller'
import authenticate from '../../middlewares/authenticate'

const router = Router()

router.post('/agents/:agentId/knowledge/text', authenticate, knowledgeController.uploadTextKnowledge)

router.post(
    '/upload-pdf',
    authenticate,
    raw({ type: ['application/pdf', 'application/octet-stream'], limit: '25mb' }),
    knowledgeController.uploadPdfKnowledge
)

router.post(
    '/agents/:agentId/knowledge/pdf',
    authenticate,
    raw({ type: ['application/pdf', 'application/octet-stream'], limit: '25mb' }),
    knowledgeController.uploadPdfKnowledge
)

router.get('/agents/:agentId/knowledge', authenticate, knowledgeController.listKnowledgeByAgent)

// Delete single chunk
router.delete('/agents/:agentId/knowledge/:chunkId', authenticate, knowledgeController.deleteKnowledgeChunk)

// Delete ALL chunks by source name (for knowledge update/replace flow)
router.delete('/agents/:agentId/knowledge/source/:sourceName', authenticate, knowledgeController.deleteKnowledgeBySource)

export default router