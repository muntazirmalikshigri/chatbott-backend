// import { NextFunction, Request, Response } from 'express'
// import asyncHandler from '../../handlers/async'
// import httpError from '../../handlers/errorHandler/httpError'
// import httpResponse from '../../handlers/httpResponse'
// import responseMessage from '../../constant/responseMessage'
// import { CustomError } from '../../utils/errors'
// import companyService from './company.service'
// import { IAuthenticateRequest } from '../../types/types'

// const readAuthenticatedUserId = (request: Request): string => {
//     const { authenticatedUser } = request as unknown as IAuthenticateRequest
//     return authenticatedUser._id.toString()
// }

// export default {
//     createCompany: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const { name, description } = request.body as { name?: string; description?: string }

//             if (!name?.trim()) {
//                 return httpError(next, new Error('Company name is required'), request, 422)
//             }

//             const result = await companyService.createCompany(ownerUserId, {
//                 name,
//                 description
//             })

//             httpResponse(response, request, 201, 'Company created successfully', result)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     }),

//     listCompanies: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const companies = await companyService.listCompanies(ownerUserId)
//             httpResponse(response, request, 200, responseMessage.SUCCESS, companies)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     }),

//     getCompanyById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const { companyId } = request.params
//             const company = await companyService.getCompanyById(companyId, ownerUserId)

//             if (!company) {
//                 return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)
//             }

//             httpResponse(response, request, 200, responseMessage.SUCCESS, company)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     }),

//     updateCompany: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const { companyId } = request.params
//             const { name, description, status } = request.body as {
//                 name?: string
//                 description?: string
//                 status?: 'active' | 'inactive'
//             }

//             const company = await companyService.updateCompany(companyId, ownerUserId, {
//                 name,
//                 description,
//                 status
//             })

//             if (!company) {
//                 return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)
//             }

//             httpResponse(response, request, 200, 'Company updated successfully', company)
//         } catch (error) {
//             if (error instanceof CustomError) {
//                 return httpError(next, error, request, error.statusCode)
//             }

//             return httpError(next, error, request, 500)
//         }
//     }),

//     deleteCompany: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             const ownerUserId = readAuthenticatedUserId(request)
//             const { companyId } = request.params
//             const deleted = await companyService.deleteCompany(companyId, ownerUserId)

//             if (!deleted) {
//                 return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)
//             }

//             httpResponse(response, request, 200, 'Company deleted successfully', null)
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
import companyService from './company.service'
import { IAuthenticateRequest } from '../../types/types'

const readAuthenticatedUserId = (request: Request): string => {
    const { authenticatedUser } = request as unknown as IAuthenticateRequest
    return authenticatedUser._id.toString()
}

export default {
    createCompany: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { name, description } = request.body as { name?: string; description?: string }

            if (!name?.trim()) {
                return httpError(next, new Error('Company name is required'), request, 422)
            }

            const result = await companyService.createCompany(ownerUserId, { name, description })
            httpResponse(response, request, 201, 'Company created successfully', result)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    listCompanies: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const companies = await companyService.listCompanies(ownerUserId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, companies)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    getCompanyById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params
            const company = await companyService.getCompanyById(companyId, ownerUserId)

            if (!company) return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)

            httpResponse(response, request, 200, responseMessage.SUCCESS, company)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    updateCompany: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params
            const { name, description, status } = request.body as {
                name?: string
                description?: string
                status?: 'active' | 'inactive'
            }

            const company = await companyService.updateCompany(companyId, ownerUserId, { name, description, status })
            if (!company) return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)

            httpResponse(response, request, 200, 'Company updated successfully', company)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    deleteCompany: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params
            const deleted = await companyService.deleteCompany(companyId, ownerUserId)

            if (!deleted) return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)

            httpResponse(response, request, 200, 'Company deleted successfully', null)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    // WhatsApp — Save credentials
    saveWhatsApp: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params
            const { phoneNumberId, accessToken, verifyToken } = request.body as {
                phoneNumberId?: string
                accessToken?: string
                verifyToken?: string
            }

            if (!phoneNumberId?.trim()) return httpError(next, new Error('phoneNumberId is required'), request, 422)
            if (!accessToken?.trim()) return httpError(next, new Error('accessToken is required'), request, 422)
            if (!verifyToken?.trim()) return httpError(next, new Error('verifyToken is required'), request, 422)

            const company = await companyService.saveWhatsApp(companyId, ownerUserId, {
                phoneNumberId: phoneNumberId.trim(),
                accessToken: accessToken.trim(),
                verifyToken: verifyToken.trim()
            })

            if (!company) return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)

            httpResponse(response, request, 200, 'WhatsApp credentials saved successfully', company)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),

    // WhatsApp — Remove credentials
    removeWhatsApp: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const ownerUserId = readAuthenticatedUserId(request)
            const { companyId } = request.params

            const company = await companyService.removeWhatsApp(companyId, ownerUserId)
            if (!company) return httpError(next, new Error(responseMessage.NOT_FOUND('Company')), request, 404)

            httpResponse(response, request, 200, 'WhatsApp removed successfully', null)
        } catch (error) {
            if (error instanceof CustomError) return httpError(next, error, request, error.statusCode)
            return httpError(next, error, request, 500)
        }
    }),
}
