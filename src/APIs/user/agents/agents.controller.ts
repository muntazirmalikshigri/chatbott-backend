import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../../handlers/async'
import httpError from '../../../handlers/errorHandler/httpError'

const legacyMessage = 'Legacy agent endpoints are deprecated. Use /v1/companies and /v1/agents instead.'

const legacyHandler = asyncHandler(async (request: Request, response: Response, nextFunction: NextFunction) => {
    void response
    return httpError(nextFunction, new Error(legacyMessage), request, 410)
})

export default {
    createAgent: legacyHandler,
    getMyAgents: legacyHandler,
    getAgent: legacyHandler,
    updateAgent: legacyHandler,
    uploadKnowledgeText: legacyHandler,
    uploadKnowledgePdf: legacyHandler,
    deleteAgent: legacyHandler
}
