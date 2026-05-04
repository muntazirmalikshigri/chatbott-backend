// import mongoose from 'mongoose'
// import agentModel, { IAgent } from './agent.model'
// import companyService from '../company/company.service'
// import knowledgeModel from '../knowledge/knowledge.model'
// import sessionModel from '../session/session.model'
// import { CustomError } from '../../utils/errors'
// import logger from '../../handlers/logger'

// export type CreateAgentInput = {
//     name: string
//     tone?: 'friendly' | 'formal'
//     instructions?: string
// }

// export type UpdateAgentInput = Partial<CreateAgentInput> & {
//     isActive?: boolean
// }

// const ensureAgentScope = async (agentId: string, ownerUserId: string): Promise<(IAgent & { _id: mongoose.Types.ObjectId }) | null> => {
//     const agent = await agentModel.findById(agentId).lean()
//     if (!agent) {
//         return null
//     }

//     const company = await companyService.ensureCompanyScope(agent.companyId.toString(), ownerUserId)
//     if (!company) {
//         return null
//     }

//     return agent
// }

// export default {
//     createAgent: async (companyId: string, ownerUserId: string, payload: CreateAgentInput) => {
//         const company = await companyService.ensureCompanyScope(companyId, ownerUserId)
//         if (!company) {
//             throw new CustomError('Company is not found or you do not own it', 404)
//         }

//         const name = payload.name.trim()
//         if (name.length < 2) {
//             throw new CustomError('Agent name must be at least 2 characters long', 422)
//         }

//         const instructions = payload.instructions?.trim()
//         const resolvedInstructions =
//             instructions || `You are the official AI assistant for ${company.name}. Help users using only company knowledge base. Never hallucinate.`
//         const resolvedTone = payload.tone ?? 'friendly'
//         const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(
//             company._id.toString(),
//             company.name,
//             company.description ?? ''
//         )

//         const agent = await agentModel.create({
//             name,
//             companyId,
//             knowledgeBaseId: knowledgeBase._id,
//             tone: resolvedTone,
//             instructions: resolvedInstructions,
//             isActive: true
//         })

//         logger.info('Agent created', {
//             meta: {
//                 agent: agent.toObject()
//             }
//         })

//         return agent
//     },

//     listAgentsByCompany: async (companyId: string, ownerUserId: string) => {
//         const company = await companyService.ensureCompanyScope(companyId, ownerUserId)
//         if (!company) {
//             throw new CustomError('Company is not found or you do not own it', 404)
//         }

//         return agentModel.find({ companyId }).sort({ createdAt: -1 })
//     },

//     getAgentById: async (agentId: string, ownerUserId: string) => {
//         return ensureAgentScope(agentId, ownerUserId)
//     },

//     getAgentPublicById: async (agentId: string): Promise<(IAgent & { _id: mongoose.Types.ObjectId; companyId: mongoose.Types.ObjectId }) | null> => {
//         const agent = await agentModel.findById(agentId).lean()
//         if (!agent) {
//             return null
//         }

//         if (agent.knowledgeBaseId) {
//             return agent
//         }

//         const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(
//             agent.companyId.toString(),
//             undefined,
//             ''
//         )

//         await agentModel.updateOne(
//             { _id: agent._id },
//             {
//                 $set: {
//                     knowledgeBaseId: knowledgeBase._id
//                 }
//             }
//         )

//         logger.warn('Backfilled missing agent knowledgeBaseId', {
//             meta: {
//                 agentId: agent._id.toString(),
//                 companyId: agent.companyId.toString(),
//                 knowledgeBaseId: knowledgeBase._id.toString()
//             }
//         })

//         return {
//             ...agent,
//             knowledgeBaseId: knowledgeBase._id
//         }
//     },

//     updateAgent: async (agentId: string, ownerUserId: string, payload: UpdateAgentInput) => {
//         const agent = await ensureAgentScope(agentId, ownerUserId)
//         if (!agent) {
//             return null
//         }

//         return agentModel.findByIdAndUpdate(
//             agentId,
//             {
//                 ...(payload.name ? { name: payload.name.trim() } : {}),
//                 ...(payload.tone ? { tone: payload.tone } : {}),
//                 ...(payload.instructions !== undefined ? { instructions: payload.instructions.trim() } : {}),
//                 ...(typeof payload.isActive === 'boolean' ? { isActive: payload.isActive } : {})
//             },
//             {
//                 new: true,
//                 runValidators: true
//             }
//         )
//     },

//     deleteAgent: async (agentId: string, ownerUserId: string) => {
//         const agent = await ensureAgentScope(agentId, ownerUserId)
//         if (!agent) {
//             return false
//         }

//         await knowledgeModel.deleteMany({ agentId })
//         await sessionModel.deleteMany({ agentId })
//         const result = await agentModel.deleteOne({ _id: agentId })
//         return result.deletedCount > 0
//     },

//     ensureAgentScope
// }




import mongoose from 'mongoose'
import agentModel, { IAgent } from './agent.model'
import companyService from '../company/company.service'
import knowledgeModel from '../knowledge/knowledge.model'
import sessionModel from '../session/session.model'
import { CustomError } from '../../utils/errors'
import logger from '../../handlers/logger'

export type CreateAgentInput = {
    name: string
    tone?: 'friendly' | 'formal'
    instructions?: string
}

export type UpdateAgentInput = Partial<CreateAgentInput> & {
    isActive?: boolean
}

const ensureAgentScope = async (agentId: string, ownerUserId: string): Promise<(IAgent & { _id: mongoose.Types.ObjectId }) | null> => {
    const agent = await agentModel.findById(agentId).lean()
    if (!agent) return null

    const company = await companyService.ensureCompanyScope(agent.companyId.toString(), ownerUserId)
    if (!company) return null

    return agent
}

export default {
    createAgent: async (companyId: string, ownerUserId: string, payload: CreateAgentInput) => {
        const company = await companyService.ensureCompanyScope(companyId, ownerUserId)
        if (!company) throw new CustomError('Company is not found or you do not own it', 404)

        const name = payload.name.trim()
        if (name.length < 2) throw new CustomError('Agent name must be at least 2 characters long', 422)

        const instructions = payload.instructions?.trim()
        const resolvedInstructions = instructions || `You are the official AI assistant for ${company.name}. Help users using only company knowledge base. Never hallucinate.`
        const resolvedTone = payload.tone ?? 'friendly'
        const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(
            company._id.toString(),
            company.name,
            company.description ?? ''
        )

        const agent = await agentModel.create({
            name,
            companyId,
            knowledgeBaseId: knowledgeBase._id,
            tone: resolvedTone,
            instructions: resolvedInstructions,
            isActive: true
        })

        logger.info('Agent created', { meta: { agent: agent.toObject() } })
        return agent
    },

    listAgentsByCompany: async (companyId: string, ownerUserId: string) => {
        const company = await companyService.ensureCompanyScope(companyId, ownerUserId)
        if (!company) throw new CustomError('Company is not found or you do not own it', 404)
        return agentModel.find({ companyId }).sort({ createdAt: -1 })
    },

    // Used by WhatsApp service — no ownerUserId check needed
    getAgentsByCompany: async (companyId: string) => {
        return agentModel.find({ companyId, isActive: true }).sort({ createdAt: -1 }).lean()
    },

    getAgentById: async (agentId: string, ownerUserId: string) => {
        return ensureAgentScope(agentId, ownerUserId)
    },

    getAgentPublicById: async (agentId: string): Promise<(IAgent & { _id: mongoose.Types.ObjectId; companyId: mongoose.Types.ObjectId }) | null> => {
        const agent = await agentModel.findById(agentId).lean()
        if (!agent) return null

        if (agent.knowledgeBaseId) return agent

        const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(
            agent.companyId.toString(),
            undefined,
            ''
        )

        await agentModel.updateOne(
            { _id: agent._id },
            { $set: { knowledgeBaseId: knowledgeBase._id } }
        )

        logger.warn('Backfilled missing agent knowledgeBaseId', {
            meta: {
                agentId: agent._id.toString(),
                companyId: agent.companyId.toString(),
                knowledgeBaseId: knowledgeBase._id.toString()
            }
        })

        return { ...agent, knowledgeBaseId: knowledgeBase._id }
    },

    updateAgent: async (agentId: string, ownerUserId: string, payload: UpdateAgentInput) => {
        const agent = await ensureAgentScope(agentId, ownerUserId)
        if (!agent) return null

        return agentModel.findByIdAndUpdate(
            agentId,
            {
                ...(payload.name ? { name: payload.name.trim() } : {}),
                ...(payload.tone ? { tone: payload.tone } : {}),
                ...(payload.instructions !== undefined ? { instructions: payload.instructions.trim() } : {}),
                ...(typeof payload.isActive === 'boolean' ? { isActive: payload.isActive } : {})
            },
            { new: true, runValidators: true }
        )
    },

    deleteAgent: async (agentId: string, ownerUserId: string) => {
        const agent = await ensureAgentScope(agentId, ownerUserId)
        if (!agent) return false

        await knowledgeModel.deleteMany({ agentId })
        await sessionModel.deleteMany({ agentId })
        const result = await agentModel.deleteOne({ _id: agentId })
        return result.deletedCount > 0
    },

    ensureAgentScope
}