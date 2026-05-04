import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import insightsService from './insights.service'
import companyService from '../company/company.service'
import { IAuthenticateRequest } from '../../types/types'

const readAuthenticatedUserId = (request: Request): string => {
    const { authenticatedUser } = request as unknown as IAuthenticateRequest
    return authenticatedUser._id.toString()
}

export default {
    getInsights: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params

            // Verify company ownership
            const company = await companyService.getCompanyById(companyId, ownerUserId)
            if (!company) {
                return httpError(next, new CustomError('Company not found or you do not own it', 404), request, 404)
            }

            const insights = await insightsService.generateInsights(companyId)
            httpResponse(response, request, 200, 'Insights generated successfully', insights)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    })
}