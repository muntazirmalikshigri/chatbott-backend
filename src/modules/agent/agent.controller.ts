import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import agentService from './agent.service'
import { IAuthenticateRequest } from '../../types/types'

const readAuthenticatedUserId = (request: Request): string => {
    const { authenticatedUser } = request as unknown as IAuthenticateRequest
    return authenticatedUser._id.toString()
}

export default {
    createAgent: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params
            const { name, tone, instructions } = request.body as {
                name?: string
                tone?: 'friendly' | 'formal'
                instructions?: string
            }

            if (!name?.trim()) {
                return httpError(next, new Error('name is required'), request, 422)
            }

            const agent = await agentService.createAgent(companyId, ownerUserId, {
                name,
                tone,
                instructions
            })

            httpResponse(response, request, 201, 'Agent created successfully', agent)
        } catch (error) {
            if (error instanceof CustomError) {
                return httpError(next, error, request, error.statusCode)
            }

            return httpError(next, error, request, 500)
        }
    }),

    listAgentsByCompany: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params
            const agents = await agentService.listAgentsByCompany(companyId, ownerUserId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, agents)
        } catch (error) {
            if (error instanceof CustomError) {
                return httpError(next, error, request, error.statusCode)
            }

            return httpError(next, error, request, 500)
        }
    }),

    getAgentById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { agentId } = request.params
            const agent = await agentService.getAgentById(agentId, ownerUserId)

            if (!agent) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('Agent')), request, 404)
            }

            httpResponse(response, request, 200, responseMessage.SUCCESS, agent)
        } catch (error) {
            if (error instanceof CustomError) {
                return httpError(next, error, request, error.statusCode)
            }

            return httpError(next, error, request, 500)
        }
    }),

    updateAgent: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { agentId } = request.params
            const { name, tone, instructions, isActive } = request.body as {
                name?: string
                tone?: 'friendly' | 'formal'
                instructions?: string
                isActive?: boolean
            }

            const agent = await agentService.updateAgent(agentId, ownerUserId, {
                name,
                tone,
                instructions,
                isActive
            })

            if (!agent) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('Agent')), request, 404)
            }

            httpResponse(response, request, 200, 'Agent updated successfully', agent)
        } catch (error) {
            if (error instanceof CustomError) {
                return httpError(next, error, request, error.statusCode)
            }

            return httpError(next, error, request, 500)
        }
    }),

    deleteAgent: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { agentId } = request.params
            const deleted = await agentService.deleteAgent(agentId, ownerUserId)

            if (!deleted) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('Agent')), request, 404)
            }

            httpResponse(response, request, 200, 'Agent deleted successfully', null)
        } catch (error) {
            if (error instanceof CustomError) {
                return httpError(next, error, request, error.statusCode)
            }

            return httpError(next, error, request, 500)
        }
    })
}
