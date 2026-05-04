// import mongoose from 'mongoose'
// import agentService from '../agent/agent.service'
// import agentModel from '../agent/agent.model'
// import knowledgeBaseModel from './knowledge-base.model'
// import knowledgeModel from './knowledge.model'
// import chunkService from './chunk.service'
// import embeddingService from './embedding.service'
// import knowledgeBaseEntryService from './knowledge-base-entry.service'
// import { CustomError } from '../../utils/errors'
// import { extractTextFromPdfBuffer } from '../../shared/utils/pdf'
// import logger from '../../handlers/logger'
// import companyService from '../company/company.service'

// export type KnowledgeUploadResult = {
//     chunksCreated: number
//     sourceType: 'text' | 'pdf'
// }

// const EXPECTED_EMBEDDING_DIMENSION = 1536

// const persistChunks = async (
//     agentId: string,
//     companyId: string,
//     knowledgeBaseId: string,
//     sourceType: 'text' | 'pdf',
//     sourceName: string,
//     chunks: string[],
//     extraMetadata: Record<string, unknown> = {}
// ): Promise<KnowledgeUploadResult> => {
//     if (!chunks.length) {
//         throw new CustomError('No readable content was found for the knowledge upload', 422)
//     }

//     const embeddedChunks = await Promise.all(
//         chunks.map(async (content, chunkIndex) => ({
//             companyId: new mongoose.Types.ObjectId(companyId),
//             knowledgeBaseId: new mongoose.Types.ObjectId(knowledgeBaseId),
//             agentId: new mongoose.Types.ObjectId(agentId),
//             sourceType,
//             sourceName,
//             text: content,
//             content,
//             embedding: await embeddingService.createEmbedding(content),
//             chunkIndex,
//             metadata: extraMetadata
//         }))
//     )

//     embeddedChunks.forEach((chunk, index) => {
//         if (!Array.isArray(chunk.embedding) || chunk.embedding.length !== EXPECTED_EMBEDDING_DIMENSION) {
//             throw new CustomError(`Invalid embedding dimension for chunk ${index + 1}`, 422)
//         }
//     })

//     await knowledgeModel.insertMany(embeddedChunks)
//     await knowledgeBaseEntryService.storeChunks(companyId, agentId, sourceName, chunks)

//     logger.info('Knowledge chunks stored', {
//         meta: {
//             agentId,
//             companyId,
//             knowledgeBaseId,
//             sourceType,
//             chunksCreated: embeddedChunks.length
//         }
//     })

//     return {
//         chunksCreated: embeddedChunks.length,
//         sourceType
//     }
// }

// export default {
//     uploadTextKnowledge: async (agentId: string, ownerUserId: string, text: string, sourceName: string = 'text-upload') => {
//         const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
//         if (!agent) {
//             throw new CustomError('Agent is not found or you do not own it', 404)
//         }

//         let knowledgeBaseId = agent.knowledgeBaseId
//         if (!knowledgeBaseId) {
//             const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(
//                 agent.companyId.toString(),
//                 undefined,
//                 ''
//             )
//             knowledgeBaseId = knowledgeBase._id

//             await agentModel.updateOne(
//                 { _id: new mongoose.Types.ObjectId(agentId) },
//                 { $set: { knowledgeBaseId } }
//             )
//         }

//         const knowledgeBase = await knowledgeBaseModel.findById(knowledgeBaseId).lean()
//         if (!knowledgeBase) {
//             throw new CustomError('Knowledge base is not found for this agent', 404)
//         }

//         const chunks = chunkService.splitText(text)
//         logger.info('Text knowledge chunking complete', {
//             meta: {
//                 agentId,
//                 knowledgeBaseId: knowledgeBaseId.toString(),
//                 chunksFound: chunks.length
//             }
//         })
//         return persistChunks(agentId, agent.companyId.toString(), knowledgeBaseId.toString(), 'text', sourceName, chunks)
//     },

//     uploadPdfKnowledge: async (agentId: string, ownerUserId: string, pdfBuffer: Buffer, sourceName: string = 'pdf-upload.pdf') => {
//         const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
//         if (!agent) {
//             throw new CustomError('Agent is not found or you do not own it', 404)
//         }

//         let knowledgeBaseId = agent.knowledgeBaseId
//         if (!knowledgeBaseId) {
//             const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(
//                 agent.companyId.toString(),
//                 undefined,
//                 ''
//             )
//             knowledgeBaseId = knowledgeBase._id
//             await agentModel.updateOne(
//                 { _id: new mongoose.Types.ObjectId(agentId) },
//                 { $set: { knowledgeBaseId } }
//             )
//         }

//         const knowledgeBase = await knowledgeBaseModel.findById(knowledgeBaseId).lean()
//         if (!knowledgeBase) {
//             throw new CustomError('Knowledge base is not found for this agent', 404)
//         }

//         const extractedText = await extractTextFromPdfBuffer(pdfBuffer)
//         if (extractedText.trim().length < 10) {
//             throw new CustomError('Could not extract usable text from the PDF file', 422)
//         }

//         const chunks = knowledgeBaseEntryService.splitPdfText(extractedText)
//         logger.info('PDF knowledge extracted', {
//             meta: {
//                 agentId,
//                 knowledgeBaseId: knowledgeBaseId.toString(),
//                 extractedLength: extractedText.length,
//                 chunksFound: chunks.length
//             }
//         })
//         return persistChunks(agentId, agent.companyId.toString(), knowledgeBaseId.toString(), 'pdf', sourceName, chunks, {
//             extractedLength: extractedText.length
//         })
//     },

//     listKnowledgeByAgent: async (agentId: string, ownerUserId: string) => {
//         const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
//         if (!agent) {
//             throw new CustomError('Agent is not found or you do not own it', 404)
//         }

//         return knowledgeModel.find({ agentId }).sort({ createdAt: -1 })
//     },

//     deleteKnowledgeChunk: async (agentId: string, chunkId: string, ownerUserId: string) => {
//         // Verify agent ownership
//         const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
//         if (!agent) {
//             throw new CustomError('Agent is not found or you do not own it', 404)
//         }

//         // Find chunk and make sure it belongs to this agent
//         const chunk = await knowledgeModel.findOne({
//             _id: new mongoose.Types.ObjectId(chunkId),
//             agentId: new mongoose.Types.ObjectId(agentId)
//         })

//         if (!chunk) {
//             throw new CustomError('Knowledge chunk is not found', 404)
//         }

//         await knowledgeModel.deleteOne({ _id: chunk._id })

//         logger.info('Knowledge chunk deleted', {
//             meta: {
//                 agentId,
//                 chunkId,
//                 sourceName: chunk.sourceName
//             }
//         })

//         return { deleted: true, chunkId }
//     }
// }






import mongoose from 'mongoose'
import agentService from '../agent/agent.service'
import agentModel from '../agent/agent.model'
import knowledgeBaseModel from './knowledge-base.model'
import knowledgeModel from './knowledge.model'
import chunkService from './chunk.service'
import embeddingService from './embedding.service'
import knowledgeBaseEntryService from './knowledge-base-entry.service'
import { CustomError } from '../../utils/errors'
import { extractTextFromPdfBuffer } from '../../shared/utils/pdf'
import logger from '../../handlers/logger'
import companyService from '../company/company.service'

export type KnowledgeUploadResult = {
    chunksCreated: number
    sourceType: 'text' | 'pdf'
}

const EXPECTED_EMBEDDING_DIMENSION = 1536

const persistChunks = async (
    agentId: string,
    companyId: string,
    knowledgeBaseId: string,
    sourceType: 'text' | 'pdf',
    sourceName: string,
    chunks: string[],
    extraMetadata: Record<string, unknown> = {}
): Promise<KnowledgeUploadResult> => {
    if (!chunks.length) throw new CustomError('No readable content was found for the knowledge upload', 422)

    const embeddedChunks = await Promise.all(
        chunks.map(async (content, chunkIndex) => ({
            companyId: new mongoose.Types.ObjectId(companyId),
            knowledgeBaseId: new mongoose.Types.ObjectId(knowledgeBaseId),
            agentId: new mongoose.Types.ObjectId(agentId),
            sourceType,
            sourceName,
            text: content,
            content,
            embedding: await embeddingService.createEmbedding(content),
           chunkIndex: Date.now() + chunkIndex,
            metadata: extraMetadata
        }))
    )

    embeddedChunks.forEach((chunk, index) => {
        if (!Array.isArray(chunk.embedding) || chunk.embedding.length !== EXPECTED_EMBEDDING_DIMENSION) {
            throw new CustomError(`Invalid embedding dimension for chunk ${index + 1}`, 422)
        }
    })

    await knowledgeModel.insertMany(embeddedChunks)
    await knowledgeBaseEntryService.storeChunks(companyId, agentId, sourceName, chunks)

    logger.info('Knowledge chunks stored', {
        meta: { agentId, companyId, knowledgeBaseId, sourceType, chunksCreated: embeddedChunks.length }
    })

    return { chunksCreated: embeddedChunks.length, sourceType }
}

export default {
    uploadTextKnowledge: async (agentId: string, ownerUserId: string, text: string, sourceName: string = 'text-upload') => {
        const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
        if (!agent) throw new CustomError('Agent is not found or you do not own it', 404)

        let knowledgeBaseId = agent.knowledgeBaseId
        if (!knowledgeBaseId) {
            const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(agent.companyId.toString(), undefined, '')
            knowledgeBaseId = knowledgeBase._id
            await agentModel.updateOne({ _id: new mongoose.Types.ObjectId(agentId) }, { $set: { knowledgeBaseId } })
        }

        const knowledgeBase = await knowledgeBaseModel.findById(knowledgeBaseId).lean()
        if (!knowledgeBase) throw new CustomError('Knowledge base is not found for this agent', 404)

        const chunks = chunkService.splitText(text)
        logger.info('Text knowledge chunking complete', {
            meta: { agentId, knowledgeBaseId: knowledgeBaseId.toString(), chunksFound: chunks.length }
        })

        return persistChunks(agentId, agent.companyId.toString(), knowledgeBaseId.toString(), 'text', sourceName, chunks)
    },

    uploadPdfKnowledge: async (agentId: string, ownerUserId: string, pdfBuffer: Buffer, sourceName: string = 'pdf-upload.pdf') => {
        const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
        if (!agent) throw new CustomError('Agent is not found or you do not own it', 404)

        let knowledgeBaseId = agent.knowledgeBaseId
        if (!knowledgeBaseId) {
            const knowledgeBase = await companyService.ensureCompanyKnowledgeBase(agent.companyId.toString(), undefined, '')
            knowledgeBaseId = knowledgeBase._id
            await agentModel.updateOne({ _id: new mongoose.Types.ObjectId(agentId) }, { $set: { knowledgeBaseId } })
        }

        const knowledgeBase = await knowledgeBaseModel.findById(knowledgeBaseId).lean()
        if (!knowledgeBase) throw new CustomError('Knowledge base is not found for this agent', 404)

        const extractedText = await extractTextFromPdfBuffer(pdfBuffer)
        if (extractedText.trim().length < 10) throw new CustomError('Could not extract usable text from the PDF file', 422)

        const chunks = knowledgeBaseEntryService.splitPdfText(extractedText)
        logger.info('PDF knowledge extracted', {
            meta: { agentId, knowledgeBaseId: knowledgeBaseId.toString(), extractedLength: extractedText.length, chunksFound: chunks.length }
        })

        return persistChunks(agentId, agent.companyId.toString(), knowledgeBaseId.toString(), 'pdf', sourceName, chunks, { extractedLength: extractedText.length })
    },

    listKnowledgeByAgent: async (agentId: string, ownerUserId: string) => {
        const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
        if (!agent) throw new CustomError('Agent is not found or you do not own it', 404)
        return knowledgeModel.find({ agentId }).sort({ createdAt: -1 })
    },

    deleteKnowledgeChunk: async (agentId: string, chunkId: string, ownerUserId: string) => {
        const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
        if (!agent) throw new CustomError('Agent is not found or you do not own it', 404)

        const chunk = await knowledgeModel.findOne({
            _id: new mongoose.Types.ObjectId(chunkId),
            agentId: new mongoose.Types.ObjectId(agentId)
        })
        if (!chunk) throw new CustomError('Knowledge chunk is not found', 404)

        await knowledgeModel.deleteOne({ _id: chunk._id })
        logger.info('Knowledge chunk deleted', { meta: { agentId, chunkId, sourceName: chunk.sourceName } })

        return { deleted: true, chunkId }
    },

    deleteKnowledgeBySource: async (agentId: string, sourceName: string, ownerUserId: string) => {
        const agent = await agentService.ensureAgentScope(agentId, ownerUserId)
        if (!agent) throw new CustomError('Agent is not found or you do not own it', 404)

        const result = await knowledgeModel.deleteMany({
            agentId: new mongoose.Types.ObjectId(agentId),
            sourceName: sourceName
        })

        logger.info('Knowledge source deleted', {
            meta: { agentId, sourceName, deletedCount: result.deletedCount }
        })

        return { deleted: true, sourceName, deletedCount: result.deletedCount }
    },
}
