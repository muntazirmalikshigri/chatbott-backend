// import { randomUUID } from 'crypto'
// import mongoose from 'mongoose'
// import agentService from '../agent/agent.service'
// import sessionModel from '../session/session.model'
// import { generateChatCompletion, AIChatMessage, createEmbedding } from '../../shared/utils/ai-client'
// import { CustomError } from '../../utils/errors'
// import logger from '../../handlers/logger'
// import { KnowledgeBaseSearchResult } from '../knowledge/knowledge-base-entry.service'
// import knowledgeChunkModel from '../knowledge/knowledge.model'

// export type ChatRequest = {
//     message: string
//     sessionId?: string
// }

// type ChatProvider = 'groq' | 'fallback'

// type ChatReply = {
//     agentId: string
//     sessionId: string
//     provider: ChatProvider
//     response: string
//     sources: Array<{
//         chunkId: string
//         sourceName: string
//         chunkIndex: number
//         content: string
//         createdAt?: Date
//     }>
// }

// const loadSessionHistory = async (agentId: string, sessionId: string): Promise<AIChatMessage[]> => {
//     const session = await sessionModel.findOne({ agentId, sessionId }).lean()
//     if (!session?.messages?.length) {
//         return []
//     }

//     return session.messages.map((message) => ({
//         role: message.role,
//         content: message.content
//     }))
// }

// const persistSession = async (
//     agentId: string,
//     companyId: string,
//     sessionId: string,
//     userMessage: string,
//     assistantMessage: string
// ): Promise<void> => {
//     const now = new Date()

//     await sessionModel.findOneAndUpdate(
//         {
//             agentId,
//             sessionId
//         },
//         {
//             $set: {
//                 companyId,
//                 lastMessageAt: now
//             },
//             $push: {
//                 messages: {
//                     $each: [
//                         {
//                             role: 'user',
//                             content: userMessage,
//                             createdAt: now
//                         },
//                         {
//                             role: 'assistant',
//                             content: assistantMessage,
//                             createdAt: now
//                         }
//                     ]
//                 }
//             }
//         },
//         {
//             upsert: true,
//             new: true
//         }
//     )
// }

// const buildContextText = (
//     chunks: Array<{
//         _id: mongoose.Types.ObjectId
//         source: string
//         chunk_index: number
//         content: string
//     }>
// ): string => {
//     if (!chunks.length) {
//         return ''
//     }

//     return chunks
//         .map((chunk, index) => `[#${index + 1} | source:${chunk.source} | chunk:${chunk.chunk_index}]\n${chunk.content}`)
//         .join('\n\n')
// }

// const buildMessages = (contextText: string, userMessage: string): AIChatMessage[] => [
//     {
//         role: 'system',
//         content: [
//             'You are a company assistant. Answer only based on the company knowledge provided below. If the answer is not in the knowledge, say "I don\'t have this information."',
//             '',
//             `Company Knowledge:\n${contextText}`
//         ].join('\n')
//     },
//     {
//         role: 'user',
//         content: userMessage
//     }
// ]

// export default {
//     reply: async (agentId: string, payload: ChatRequest): Promise<ChatReply> => {
//         const { message, sessionId } = payload
//         const trimmedMessage = message.trim()

//         if (!trimmedMessage) {
//             throw new CustomError('message is required', 422)
//         }

//         const agent = await agentService.getAgentPublicById(agentId)
//         if (!agent) {
//             throw new CustomError('Agent is not found', 404)
//         }

//         console.log('[CHAT] Step 1 - Agent loaded:', agent._id.toString())
//         console.log('[CHAT] Step 2 - knowledgeBaseId:', agent.knowledgeBaseId?.toString())

//         logger.info('Chat request agent loaded', {
//             meta: {
//                 agentId,
//                 name: agent.name,
//                 tone: agent.tone,
//                 instructions: agent.instructions,
//                 knowledgeBaseId: agent.knowledgeBaseId?.toString() ?? null
//             }
//         })

//         const conversationSessionId = sessionId?.trim() || randomUUID()
//         await loadSessionHistory(agentId, conversationSessionId)

//         let knowledgeChunks: KnowledgeBaseSearchResult[] = []

//         try {
//             const userEmbedding = await createEmbedding(trimmedMessage)
//             const vectorSimilarityResults = await knowledgeChunkModel.find({
//                 knowledgeBaseId: agent.knowledgeBaseId
//             }).limit(10).lean()

//             if (vectorSimilarityResults.length > 0) {
//                 const scoredChunks = vectorSimilarityResults.map(chunk => {
//                     let similarity = 0
//                     if (chunk.embedding && userEmbedding) {
//                         const chunkEmbedding = chunk.embedding
//                         const dotProduct = chunkEmbedding.reduce((sum, val, i) => sum + val * userEmbedding[i], 0)
//                         const mag1 = Math.sqrt(chunkEmbedding.reduce((sum, val) => sum + val * val, 0))
//                         const mag2 = Math.sqrt(userEmbedding.reduce((sum, val) => sum + val * val, 0))
//                         similarity = dotProduct / (mag1 * mag2)
//                     }
//                     return { ...chunk, relevance: similarity }
//                 }).sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))

//                 knowledgeChunks = scoredChunks
//                     .filter(c => (c.relevance ?? 0) > 0)
//                     .slice(0, 5)
//                     .map(c => ({
//                         _id: c._id,
//                         company_id: c.companyId,
//                         agent_id: c.agentId,
//                         source: c.sourceName ?? '',
//                         chunk_index: c.chunkIndex,
//                         content: c.content,
//                         created_at: c.createdAt
//                     })) as KnowledgeBaseSearchResult[]
//             }
//         } catch (err) {
//             console.error('[CHAT] Vector search failed:', err instanceof Error ? err.message : String(err))
//         }

//         if (!knowledgeChunks || knowledgeChunks.length === 0) {
//             const plainMongoResults = await knowledgeChunkModel.find({
//                 knowledgeBaseId: agent.knowledgeBaseId
//             }).limit(10).lean()

//             if (plainMongoResults.length > 0) {
//                 knowledgeChunks = plainMongoResults.map(c => ({
//                     _id: c._id,
//                     company_id: c.companyId,
//                     agent_id: c.agentId,
//                     source: c.sourceName ?? '',
//                     chunk_index: c.chunkIndex,
//                     content: c.content,
//                     created_at: c.createdAt
//                 })) as KnowledgeBaseSearchResult[]
//             }
//         }

//         console.log('[CHAT] Step 3 - Chunks retrieved:', knowledgeChunks.length)

//         const contextText = buildContextText(knowledgeChunks)
//         logger.info('Company knowledge retrieved', {
//             meta: {
//                 agentId,
//                 companyId: agent.companyId.toString(),
//                 sources: knowledgeChunks.length
//             }
//         })

//         const messages = buildMessages(contextText, trimmedMessage)

//         let responseText = ''
//         let provider: ChatProvider = 'groq'

//         console.log('[CHAT] Step 4 - Calling Grok API...')

//         try {
//             const aiResponse = await generateChatCompletion(messages)
//             responseText = aiResponse.content
//             provider = aiResponse.provider
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : String(error)
//             logger.error('Grok/Groq request failed, using fallback response', {
//                 meta: {
//                     agentId,
//                     error: errorMessage
//                 }
//             })
//             responseText = 'I am unable to answer right now. Please try again later.'
//             provider = 'fallback'
//         }

//         console.log('[CHAT] Step 5 - Grok response received')

//         await persistSession(
//             agentId,
//             agent.companyId.toString(),
//             conversationSessionId,
//             trimmedMessage,
//             responseText
//         )

//         return {
//             agentId,
//             sessionId: conversationSessionId,
//             provider,
//             response: responseText,
//             sources: knowledgeChunks.map((chunk) => ({
//                 chunkId: chunk._id.toString(),
//                 sourceName: chunk.source,
//                 chunkIndex: chunk.chunk_index,
//                 content: chunk.content,
//                 createdAt: chunk.created_at
//             }))
//         }
//     }
// }






import { randomUUID } from 'crypto'
import agentService from '../agent/agent.service'
import sessionModel from '../session/session.model'
import { generateChatCompletion, AIChatMessage } from '../../shared/utils/ai-client'
import { CustomError } from '../../utils/errors'
import logger from '../../handlers/logger'
import ragService from './rag.service'

export type ChatRequest = {
    message: string
    sessionId?: string
}

type ChatProvider = 'groq' | 'fallback'

type ChatReply = {
    agentId: string
    sessionId: string
    provider: ChatProvider
    response: string
    sources: Array<{
        chunkId: string
        sourceName: string
        chunkIndex: number
        content: string
        score?: number
    }>
}

const loadSessionHistory = async (agentId: string, sessionId: string): Promise<AIChatMessage[]> => {
    const session = await sessionModel.findOne({ agentId, sessionId }).lean()
    if (!session?.messages?.length) return []
    return session.messages.map((message) => ({
        role: message.role,
        content: message.content
    }))
}

const persistSession = async (
    agentId: string,
    companyId: string,
    sessionId: string,
    userMessage: string,
    assistantMessage: string
): Promise<void> => {
    const now = new Date()
    await sessionModel.findOneAndUpdate(
        { agentId, sessionId },
        {
            $set: { companyId, lastMessageAt: now },
            $push: {
                messages: {
                    $each: [
                        { role: 'user', content: userMessage, createdAt: now },
                        { role: 'assistant', content: assistantMessage, createdAt: now }
                    ]
                }
            }
        },
        { upsert: true, new: true }
    )
}

export default {
    reply: async (agentId: string, payload: ChatRequest): Promise<ChatReply> => {
        const { message, sessionId } = payload
        const trimmedMessage = message.trim()

        if (!trimmedMessage) {
            throw new CustomError('message is required', 422)
        }

        // Step 1 — Load agent
        const agent = await agentService.getAgentPublicById(agentId)
        if (!agent) {
            throw new CustomError('Agent is not found', 404)
        }

        logger.info('Chat request agent loaded', {
            meta: {
                agentId,
                name: agent.name,
                tone: agent.tone,
                instructions: agent.instructions,
                knowledgeBaseId: agent.knowledgeBaseId?.toString() ?? null
            }
        })

        // Step 2 — Load session history
        const conversationSessionId = sessionId?.trim() || randomUUID()
        const history = await loadSessionHistory(agentId, conversationSessionId)

        // Step 3 — RAG: retrieve relevant knowledge chunks
        let ragContext
        try {
            ragContext = await ragService.buildContext(agentId, trimmedMessage, 5)
            logger.info('RAG context built successfully', {
                meta: {
                    agentId,
                    chunks: ragContext.chunks.length,
                    sources: ragContext.sources.length
                }
            })
        } catch (err) {
            logger.warn('RAG context build failed, proceeding without knowledge', {
                meta: {
                    agentId,
                    error: err instanceof Error ? err.message : String(err)
                }
            })
            ragContext = {
                chunks: [],
                contextText: 'No relevant knowledge found.',
                sources: []
            }
        }

        // Step 4 — Build messages with RAG context + history
        const messages = ragService.buildMessages(
            agent,
            trimmedMessage,
            ragContext.contextText,
            history
        )

        // Step 5 — Call Grok/Groq API
        let responseText = ''
        let provider: ChatProvider = 'groq'

        try {
            const aiResponse = await generateChatCompletion(messages)
            responseText = aiResponse.content
            provider = aiResponse.provider as ChatProvider
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error('Grok/Groq request failed, using fallback response', {
                meta: { agentId, error: errorMessage }
            })
            responseText = 'I am unable to answer right now. Please try again later.'
            provider = 'fallback'
        }

        // Step 6 — Persist session
        await persistSession(
            agentId,
            agent.companyId.toString(),
            conversationSessionId,
            trimmedMessage,
            responseText
        )

        logger.info('Chat response sent', {
            meta: {
                agentId,
                provider,
                sessionId: conversationSessionId,
                sources: ragContext.sources.length
            }
        })

        return {
            agentId,
            sessionId: conversationSessionId,
            provider,
            response: responseText,
            sources: ragContext.sources.map((s) => ({
                chunkId: s.chunkId,
                sourceName: s.sourceName,
                chunkIndex: 0,
                content: s.content,
                score: s.score
            }))
        }
    }
}


