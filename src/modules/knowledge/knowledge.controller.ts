
// import { NextFunction, Request, Response } from 'express'
// import asyncHandler from '../../handlers/async'
// import httpError from '../../handlers/errorHandler/httpError'
// import httpResponse from '../../handlers/httpResponse'
// import responseMessage from '../../constant/responseMessage'
// import { CustomError } from '../../utils/errors'
// import knowledgeService from './knowledge.service'
// import { IAuthenticateRequest } from '../../types/types'

// const readAuthenticatedUserId = (request: Request): string => {
//     const { authenticatedUser } = request as unknown as IAuthenticateRequest
//     return authenticatedUser._id.toString()
// }

// const resolveAgentId = (request: Request): string => {
//     const { agentId } = request.params as { agentId?: string }
//     if (agentId?.trim()) {
//         return agentId.trim()
//     }

//     const queryAgentId = request.query.agentId
//     if (typeof queryAgentId === 'string' && queryAgentId.trim()) {
//         return queryAgentId.trim()
//     }

//     return ''
// }

// export default {
//     uploadTextKnowledge: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const { agentId } = request.params
//             const { text, sourceName } = request.body as {
//                 text?: string
//                 sourceName?: string
//             }

//             if (!text?.trim()) {
//                 return httpError(next, new Error('text is required'), request, 422)
//             }

//             const result = await knowledgeService.uploadTextKnowledge(agentId, ownerUserId, text, sourceName)
//             httpResponse(response, request, 201, 'Text knowledge uploaded successfully', result)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     }),

//     uploadPdfKnowledge: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const agentId = resolveAgentId(request)
//             const sourceName = (request.query.sourceName as string | undefined) ?? 'pdf-upload.pdf'
//             const body = request.body

//             if (!agentId) {
//                 return httpError(next, new Error('agentId is required'), request, 422)
//             }

//             if (!Buffer.isBuffer(body) || body.length === 0) {
//                 return httpError(next, new Error('PDF file buffer is required'), request, 422)
//             }

//             const result = await knowledgeService.uploadPdfKnowledge(agentId, ownerUserId, body, sourceName)
//             httpResponse(response, request, 201, 'PDF knowledge uploaded successfully', result)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     }),

//     listKnowledgeByAgent: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const { agentId } = request.params
//             const knowledge = await knowledgeService.listKnowledgeByAgent(agentId, ownerUserId)
//             httpResponse(response, request, 200, responseMessage.SUCCESS, knowledge)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     }),

//     deleteKnowledgeChunk: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const { agentId, chunkId } = request.params

//             if (!chunkId?.trim()) {
//                 return httpError(next, new Error('chunkId is required'), request, 422)
//             }

//             await knowledgeService.deleteKnowledgeChunk(agentId, chunkId, ownerUserId)
//             httpResponse(response, request, 200, 'Knowledge chunk deleted successfully', null)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     })
// }




import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import knowledgeService from './knowledge.service'
import { IAuthenticateRequest } from '../../types/types'

const readAuthenticatedUserId = (request: Request): string => {
    const { authenticatedUser } = request as unknown as IAuthenticateRequest
    return authenticatedUser._id.toString()
}

const resolveAgentId = (request: Request): string => {
    const { agentId } = request.params as { agentId?: string }
    if (agentId?.trim()) return agentId.trim()
    const queryAgentId = request.query.agentId
    if (typeof queryAgentId === 'string' && queryAgentId.trim()) return queryAgentId.trim()
    return ''
}

export default {
    uploadTextKnowledge: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { agentId } = request.params
            const { text, sourceName } = request.body as { text?: string; sourceName?: string }

            if (!text?.trim()) return httpError(next, new Error('text is required'), request, 422)

            const result = await knowledgeService.uploadTextKnowledge(agentId, ownerUserId, text, sourceName)
            httpResponse(response, request, 201, 'Text knowledge uploaded successfully', result)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    uploadPdfKnowledge: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const agentId = resolveAgentId(request)
            const sourceName = (request.query.sourceName as string | undefined) ?? 'pdf-upload.pdf'
            const body = request.body

            if (!agentId) return httpError(next, new Error('agentId is required'), request, 422)
            if (!Buffer.isBuffer(body) || body.length === 0) return httpError(next, new Error('PDF file buffer is required'), request, 422)

            const result = await knowledgeService.uploadPdfKnowledge(agentId, ownerUserId, body, sourceName)
            httpResponse(response, request, 201, 'PDF knowledge uploaded successfully', result)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    listKnowledgeByAgent: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { agentId } = request.params
            const knowledge = await knowledgeService.listKnowledgeByAgent(agentId, ownerUserId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, knowledge)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    deleteKnowledgeChunk: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { agentId, chunkId } = request.params

            if (!chunkId?.trim()) return httpError(next, new Error('chunkId is required'), request, 422)

            await knowledgeService.deleteKnowledgeChunk(agentId, chunkId, ownerUserId)
            httpResponse(response, request, 200, 'Knowledge chunk deleted successfully', null)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    deleteKnowledgeBySource: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { agentId, sourceName } = request.params

            if (!sourceName?.trim()) return httpError(next, new Error('sourceName is required'), request, 422)

            const result = await knowledgeService.deleteKnowledgeBySource(agentId, decodeURIComponent(sourceName), ownerUserId)
            httpResponse(response, request, 200, 'Knowledge source deleted successfully', result)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),
}
