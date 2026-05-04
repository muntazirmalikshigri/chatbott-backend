// import mongoose from 'mongoose'
// import companyModel, { ICompany } from './company.model'
// import agentModel, { IAgent } from '../agent/agent.model'
// import knowledgeBaseModel from '../knowledge/knowledge-base.model'
// import { IKnowledgeBase } from '../knowledge/knowledge-base.model'
// import knowledgeModel from '../knowledge/knowledge.model'
// import sessionModel from '../session/session.model'
// import { CustomError } from '../../utils/errors'
// import logger from '../../handlers/logger'

// export type CreateCompanyInput = {
//     name: string
//     description?: string
// }

// export type UpdateCompanyInput = {
//     name?: string
//     description?: string
//     status?: 'active' | 'inactive'
// }

// export type CreateCompanyResult = {
//     company: ICompany & { _id: mongoose.Types.ObjectId; defaultKnowledgeBaseId?: mongoose.Types.ObjectId | null }
//     defaultAgent: IAgent & { _id: mongoose.Types.ObjectId }
// }

// export type KnowledgeBaseDocument = IKnowledgeBase & { _id: mongoose.Types.ObjectId }

// const createSlug = (name: string): string =>
//     name
//         .toLowerCase()
//         .trim()
//         .replace(/[^a-z0-9]+/g, '-')
//         .replace(/^-+|-+$/g, '')

// const ensureCompanyScope = async (companyId: string, ownerUserId: string): Promise<(ICompany & { _id: mongoose.Types.ObjectId }) | null> => {
//     return companyModel
//         .findOne({
//             _id: companyId,
//             ownerUserId
//         })
//         .lean()
// }

// const ensureCompanyKnowledgeBase = async (
//     companyId: string,
//     fallbackName?: string,
//     fallbackDescription: string = ''
// ): Promise<KnowledgeBaseDocument> => {
//     const company = await companyModel.findById(companyId)
//     if (!company) {
//         throw new CustomError('Company is not found', 404)
//     }

//     if (company.defaultKnowledgeBaseId) {
//         const existing = await knowledgeBaseModel.findById(company.defaultKnowledgeBaseId)
//         if (existing) {
//             return existing.toObject() as KnowledgeBaseDocument
//         }
//     }

//     const existingByCompany = await knowledgeBaseModel.findOne({ companyId })
//     if (existingByCompany) {
//         await companyModel.updateOne(
//             { _id: company._id },
//             {
//                 $set: {
//                     defaultKnowledgeBaseId: existingByCompany._id
//                 }
//             }
//         )
//         return existingByCompany.toObject() as KnowledgeBaseDocument
//     }

//     const knowledgeBase = await knowledgeBaseModel.create({
//         companyId: company._id,
//         name: fallbackName ? `${fallbackName} Knowledge Base` : `${company.name} Knowledge Base`,
//         description: fallbackDescription || company.description || '',
//         isActive: true
//     })

//     await companyModel.updateOne(
//         { _id: company._id },
//         {
//             $set: {
//                 defaultKnowledgeBaseId: knowledgeBase._id
//             }
//         }
//     )

//     logger.info('Knowledge base ensured for company', {
//         meta: {
//             companyId: company._id.toString(),
//             knowledgeBaseId: knowledgeBase._id.toString()
//         }
//     })

//     return knowledgeBase.toObject() as KnowledgeBaseDocument
// }

// const generateAgentName = (companyName: string, description?: string): string => {
//     const desc = (description ?? '').toLowerCase()
    
//     if (desc.includes('tour') || desc.includes('travel') || desc.includes('trek') || desc.includes('trip')) {
//         return `${companyName} · Travel Guide`
//     }
//     if (desc.includes('shop') || desc.includes('store') || desc.includes('retail') || desc.includes('ecom')) {
//         return `${companyName} · Shop Advisor`
//     }
//     if (desc.includes('tech') || desc.includes('software') || desc.includes('it') || desc.includes('computer')) {
//         return `${companyName} · Tech Advisor`
//     }
//     if (desc.includes('health') || desc.includes('medical') || desc.includes('clinic') || desc.includes('doctor')) {
//         return `${companyName} · Health Guide`
//     }
//     if (desc.includes('edu') || desc.includes('school') || desc.includes('learn') || desc.includes('course')) {
//         return `${companyName} · Learning Guide`
//     }
//     if (desc.includes('food') || desc.includes('restaurant') || desc.includes('cafe') || desc.includes('dining')) {
//         return `${companyName} · Dining Guide`
//     }
//     if (desc.includes('finance') || desc.includes('bank') || desc.includes('invest')) {
//         return `${companyName} · Finance Advisor`
//     }
//     if (desc.includes('real estate') || desc.includes('property') || desc.includes('housing')) {
//         return `${companyName} · Property Guide`
//     }
//     if (desc.includes('fashion') || desc.includes('clothing') || desc.includes('apparel')) {
//         return `${companyName} · Style Advisor`
//     }
//     // Default unique format
//     return `${companyName} · AI Advisor`
// }

// export default {
//     createCompany: async (ownerUserId: string, payload: CreateCompanyInput): Promise<CreateCompanyResult> => {
//         const name = payload.name.trim()
//         if (name.length < 2) {
//             throw new CustomError('Company name must be at least 2 characters long', 422)
//         }

//         const slug = createSlug(name)
//         const company = await companyModel.create({
//             name,
//             slug,
//             ownerUserId,
//             description: payload.description?.trim() ?? '',
//             status: 'active'
//         })

//         try {
//             const knowledgeBase = await ensureCompanyKnowledgeBase(company._id.toString(), name, payload.description?.trim() ?? '')
//             const agentName = generateAgentName(name, payload.description)

//             const defaultAgent = await agentModel.create({
//                 name: agentName,
//                 companyId: company._id,
//                 knowledgeBaseId: knowledgeBase._id,
//                 tone: 'friendly',
//                 instructions: `You are the official AI assistant for ${name}. Help users using only company knowledge base. Never hallucinate.`,
//                 isActive: true
//             })

//             logger.info('Default agent auto-created for company', {
//                 meta: {
//                     companyId: company._id.toString(),
//                     companyName: company.name,
//                     knowledgeBaseId: knowledgeBase._id.toString(),
//                     defaultAgent: defaultAgent.toObject()
//                 }
//             })

//             return {
//                 company: {
//                     ...company.toObject(),
//                     defaultKnowledgeBaseId: knowledgeBase._id
//                 },
//                 defaultAgent
//             }
//         } catch (error) {
//             await knowledgeBaseModel.deleteOne({ companyId: company._id })
//             await companyModel.deleteOne({ _id: company._id })
//             throw error
//         }
//     },

//     listCompanies: (ownerUserId: string) => {
//         return companyModel.find({ ownerUserId }).sort({ createdAt: -1 })
//     },

//     getCompanyById: async (companyId: string, ownerUserId: string) => {
//         return ensureCompanyScope(companyId, ownerUserId)
//     },

//     updateCompany: async (companyId: string, ownerUserId: string, payload: UpdateCompanyInput) => {
//         const company = await companyModel.findOneAndUpdate(
//             {
//                 _id: companyId,
//                 ownerUserId
//             },
//             {
//                 ...(payload.name ? { name: payload.name.trim(), slug: createSlug(payload.name) } : {}),
//                 ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
//                 ...(payload.status ? { status: payload.status } : {})
//             },
//             {
//                 new: true,
//                 runValidators: true
//             }
//         )

//         return company
//     },

//     deleteCompany: async (companyId: string, ownerUserId: string) => {
//         const company = await companyModel.findOne({
//             _id: companyId,
//             ownerUserId
//         })

//         if (!company) {
//             return false
//         }

//         const knowledgeBases = await knowledgeBaseModel.find({ companyId }).select('_id').lean()
//         const knowledgeBaseIds = knowledgeBases.map((knowledgeBase) => knowledgeBase._id)
//         const agents = await agentModel.find({ companyId }).select('_id').lean()
//         const agentIds = agents.map((agent) => agent._id)

//         if (knowledgeBaseIds.length > 0) {
//             await knowledgeModel.deleteMany({ knowledgeBaseId: { $in: knowledgeBaseIds }, companyId })
//         } else if (agentIds.length > 0) {
//             await knowledgeModel.deleteMany({ agentId: { $in: agentIds }, companyId })
//         } else {
//             await knowledgeModel.deleteMany({ companyId })
//         }

//         if (knowledgeBaseIds.length > 0) {
//             await knowledgeBaseModel.deleteMany({ _id: { $in: knowledgeBaseIds } })
//         }

//         if (agentIds.length > 0) {
//             await sessionModel.deleteMany({ agentId: { $in: agentIds }, companyId })
//             await agentModel.deleteMany({ _id: { $in: agentIds } })
//         } else {
//             await sessionModel.deleteMany({ companyId })
//         }

//         await companyModel.deleteOne({
//             _id: companyId,
//             ownerUserId
//         })

//         return true
//     },

//     ensureCompanyScope,
//     ensureCompanyKnowledgeBase
// }




import mongoose from 'mongoose'
import companyModel, { ICompany } from './company.model'
import agentModel, { IAgent } from '../agent/agent.model'
import knowledgeBaseModel from '../knowledge/knowledge-base.model'
import { IKnowledgeBase } from '../knowledge/knowledge-base.model'
import knowledgeModel from '../knowledge/knowledge.model'
import sessionModel from '../session/session.model'
import { CustomError } from '../../utils/errors'
import logger from '../../handlers/logger'

export type CreateCompanyInput = {
    name: string
    description?: string
}

export type UpdateCompanyInput = {
    name?: string
    description?: string
    status?: 'active' | 'inactive'
}

export type WhatsAppInput = {
    phoneNumberId: string
    accessToken: string
    verifyToken: string
}

export type CreateCompanyResult = {
    company: ICompany & { _id: mongoose.Types.ObjectId; defaultKnowledgeBaseId?: mongoose.Types.ObjectId | null }
    defaultAgent: IAgent & { _id: mongoose.Types.ObjectId }
}

export type KnowledgeBaseDocument = IKnowledgeBase & { _id: mongoose.Types.ObjectId }

const createSlug = (name: string): string =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const ensureCompanyScope = async (companyId: string, ownerUserId: string): Promise<(ICompany & { _id: mongoose.Types.ObjectId }) | null> => {
    return companyModel.findOne({ _id: companyId, ownerUserId }).lean()
}

const ensureCompanyKnowledgeBase = async (
    companyId: string,
    fallbackName?: string,
    fallbackDescription: string = ''
): Promise<KnowledgeBaseDocument> => {
    const company = await companyModel.findById(companyId)
    if (!company) throw new CustomError('Company is not found', 404)

    if (company.defaultKnowledgeBaseId) {
        const existing = await knowledgeBaseModel.findById(company.defaultKnowledgeBaseId)
        if (existing) return existing.toObject() as KnowledgeBaseDocument
    }

    const existingByCompany = await knowledgeBaseModel.findOne({ companyId })
    if (existingByCompany) {
        await companyModel.updateOne({ _id: company._id }, { $set: { defaultKnowledgeBaseId: existingByCompany._id } })
        return existingByCompany.toObject() as KnowledgeBaseDocument
    }

    const knowledgeBase = await knowledgeBaseModel.create({
        companyId: company._id,
        name: fallbackName ? `${fallbackName} Knowledge Base` : `${company.name} Knowledge Base`,
        description: fallbackDescription || company.description || '',
        isActive: true
    })

    await companyModel.updateOne({ _id: company._id }, { $set: { defaultKnowledgeBaseId: knowledgeBase._id } })

    logger.info('Knowledge base ensured for company', {
        meta: { companyId: company._id.toString(), knowledgeBaseId: knowledgeBase._id.toString() }
    })

    return knowledgeBase.toObject() as KnowledgeBaseDocument
}

const generateAgentName = (companyName: string, description?: string): string => {
    const desc = (description ?? '').toLowerCase()
    if (desc.includes('tour') || desc.includes('travel') || desc.includes('trek') || desc.includes('trip')) return `${companyName} · Travel Guide`
    if (desc.includes('shop') || desc.includes('store') || desc.includes('retail') || desc.includes('ecom')) return `${companyName} · Shop Advisor`
    if (desc.includes('tech') || desc.includes('software') || desc.includes('it') || desc.includes('computer')) return `${companyName} · Tech Advisor`
    if (desc.includes('health') || desc.includes('medical') || desc.includes('clinic') || desc.includes('doctor')) return `${companyName} · Health Guide`
    if (desc.includes('edu') || desc.includes('school') || desc.includes('learn') || desc.includes('course')) return `${companyName} · Learning Guide`
    if (desc.includes('food') || desc.includes('restaurant') || desc.includes('cafe') || desc.includes('dining')) return `${companyName} · Dining Guide`
    if (desc.includes('finance') || desc.includes('bank') || desc.includes('invest')) return `${companyName} · Finance Advisor`
    if (desc.includes('real estate') || desc.includes('property') || desc.includes('housing')) return `${companyName} · Property Guide`
    if (desc.includes('fashion') || desc.includes('clothing') || desc.includes('apparel')) return `${companyName} · Style Advisor`
    return `${companyName} · AI Advisor`
}

export default {
    createCompany: async (ownerUserId: string, payload: CreateCompanyInput): Promise<CreateCompanyResult> => {
        const name = payload.name.trim()
        if (name.length < 2) throw new CustomError('Company name must be at least 2 characters long', 422)

        const slug = createSlug(name)
        const company = await companyModel.create({
            name, slug, ownerUserId,
            description: payload.description?.trim() ?? '',
            status: 'active'
        })

        try {
            const knowledgeBase = await ensureCompanyKnowledgeBase(company._id.toString(), name, payload.description?.trim() ?? '')
            const agentName = generateAgentName(name, payload.description)

            const defaultAgent = await agentModel.create({
                name: agentName,
                companyId: company._id,
                knowledgeBaseId: knowledgeBase._id,
                tone: 'friendly',
                instructions: `You are the official AI assistant for ${name}. Help users using only company knowledge base. Never hallucinate.`,
                isActive: true
            })

            logger.info('Default agent auto-created for company', {
                meta: { companyId: company._id.toString(), companyName: company.name, knowledgeBaseId: knowledgeBase._id.toString() }
            })

            return {
                company: { ...company.toObject(), defaultKnowledgeBaseId: knowledgeBase._id },
                defaultAgent
            }
        } catch (error) {
            await knowledgeBaseModel.deleteOne({ companyId: company._id })
            await companyModel.deleteOne({ _id: company._id })
            throw error
        }
    },

    listCompanies: (ownerUserId: string) => {
        return companyModel.find({ ownerUserId }).sort({ createdAt: -1 })
    },

    getCompanyById: async (companyId: string, ownerUserId: string) => {
        return ensureCompanyScope(companyId, ownerUserId)
    },

    updateCompany: async (companyId: string, ownerUserId: string, payload: UpdateCompanyInput) => {
        return companyModel.findOneAndUpdate(
            { _id: companyId, ownerUserId },
            {
                ...(payload.name ? { name: payload.name.trim(), slug: createSlug(payload.name) } : {}),
                ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
                ...(payload.status ? { status: payload.status } : {})
            },
            { new: true, runValidators: true }
        )
    },

    deleteCompany: async (companyId: string, ownerUserId: string) => {
        const company = await companyModel.findOne({ _id: companyId, ownerUserId })
        if (!company) return false

        const knowledgeBases = await knowledgeBaseModel.find({ companyId }).select('_id').lean()
        const knowledgeBaseIds = knowledgeBases.map(kb => kb._id)
        const agents = await agentModel.find({ companyId }).select('_id').lean()
        const agentIds = agents.map(a => a._id)

        if (knowledgeBaseIds.length > 0) {
            await knowledgeModel.deleteMany({ knowledgeBaseId: { $in: knowledgeBaseIds }, companyId })
        } else if (agentIds.length > 0) {
            await knowledgeModel.deleteMany({ agentId: { $in: agentIds }, companyId })
        } else {
            await knowledgeModel.deleteMany({ companyId })
        }

        if (knowledgeBaseIds.length > 0) await knowledgeBaseModel.deleteMany({ _id: { $in: knowledgeBaseIds } })
        if (agentIds.length > 0) {
            await sessionModel.deleteMany({ agentId: { $in: agentIds }, companyId })
            await agentModel.deleteMany({ _id: { $in: agentIds } })
        } else {
            await sessionModel.deleteMany({ companyId })
        }

        await companyModel.deleteOne({ _id: companyId, ownerUserId })
        return true
    },

    // WhatsApp — Save credentials
    saveWhatsApp: async (companyId: string, ownerUserId: string, payload: WhatsAppInput) => {
        const company = await companyModel.findOneAndUpdate(
            { _id: companyId, ownerUserId },
            {
                $set: {
                    'whatsapp.phoneNumberId': payload.phoneNumberId,
                    'whatsapp.accessToken': payload.accessToken,
                    'whatsapp.verifyToken': payload.verifyToken,
                    'whatsapp.isActive': false, // Will be activated after Meta verifies webhook
                    'whatsapp.verifiedAt': null,
                }
            },
            { new: true }
        )

        if (!company) return null

        logger.info('WhatsApp credentials saved for company', {
            meta: { companyId, phoneNumberId: payload.phoneNumberId }
        })

        return company
    },

    // WhatsApp — Remove credentials
    removeWhatsApp: async (companyId: string, ownerUserId: string) => {
        const company = await companyModel.findOneAndUpdate(
            { _id: companyId, ownerUserId },
            { $set: { whatsapp: null } },
            { new: true }
        )

        if (!company) return null

        logger.info('WhatsApp removed for company', { meta: { companyId } })
        return company
    },

    // WhatsApp — Get company by phoneNumberId (for webhook)
    getCompanyByPhoneNumberId: async (phoneNumberId: string) => {
        return companyModel.findOne({ 'whatsapp.phoneNumberId': phoneNumberId, 'whatsapp.isActive': true }).lean()
    },

    // WhatsApp — Activate after webhook verified
    activateWhatsApp: async (companyId: string) => {
        return companyModel.findByIdAndUpdate(
            companyId,
            { $set: { 'whatsapp.isActive': true, 'whatsapp.verifiedAt': new Date() } },
            { new: true }
        )
    },

    ensureCompanyScope,
    ensureCompanyKnowledgeBase
}