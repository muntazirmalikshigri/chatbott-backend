import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import whatsappService from './whatsapp.service'
import companyService from '../company/company.service'
import { IAuthenticateRequest } from '../../types/types'

const readAuthenticatedUserId = (request: Request): string => {
    const { authenticatedUser } = request as unknown as IAuthenticateRequest
    return authenticatedUser._id.toString()
}

export default {
    // POST /v1/whatsapp/:companyId/connect
    connect: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params

            const company = await companyService.getCompanyById(companyId, ownerUserId)
            if (!company) return httpError(next, new CustomError('Company not found', 404), request, 404)

            // Start connection (async — QR will be generated)
            void whatsappService.connectCompany(companyId)

            httpResponse(response, request, 200, 'WhatsApp connection initiated. Fetch QR code.', {
                status: 'connecting',
                companyId
            })
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    // GET /v1/whatsapp/:companyId/qr
    getQR: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params

            const company = await companyService.getCompanyById(companyId, ownerUserId)
            if (!company) return httpError(next, new CustomError('Company not found', 404), request, 404)

            const qr = whatsappService.getQRCode(companyId)
            const status = whatsappService.getStatus(companyId)

            httpResponse(response, request, 200, 'QR code fetched', { qr, status })
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    // GET /v1/whatsapp/:companyId/status
    getStatus: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params

            const company = await companyService.getCompanyById(companyId, ownerUserId)
            if (!company) return httpError(next, new CustomError('Company not found', 404), request, 404)

            const status = whatsappService.getStatus(companyId)
            const sessionInfo = await whatsappService.getSessionInfo(companyId)

            httpResponse(response, request, 200, 'WhatsApp status', {
                status,
                isConnected: sessionInfo?.isConnected ?? false,
                phoneNumber: sessionInfo?.phoneNumber ?? null,
                connectedAt: sessionInfo?.connectedAt ?? null,
            })
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    // DELETE /v1/whatsapp/:companyId/disconnect
    disconnect: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params

            const company = await companyService.getCompanyById(companyId, ownerUserId)
            if (!company) return httpError(next, new CustomError('Company not found', 404), request, 404)

            await whatsappService.disconnectCompany(companyId)
            httpResponse(response, request, 200, 'WhatsApp disconnected successfully', null)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),
}