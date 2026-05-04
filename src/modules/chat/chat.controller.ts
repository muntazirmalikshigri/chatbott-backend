import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import chatService from './chat.service'
import { CustomError } from '../../utils/errors'

export default {
    chat: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { agentId } = request.params
            const { message, sessionId } = request.body as {
                message?: string
                sessionId?: string
            }

            if (!message?.trim()) {
                return httpError(next, new Error('message is required'), request, 422)
            }

            const result = await chatService.reply(agentId, {
                message,
                sessionId
            })

            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                return httpError(next, error, request, error.statusCode)
            }

            return httpError(next, error, request, 500)
        }
    })
}
