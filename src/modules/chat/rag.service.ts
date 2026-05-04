import mongoose from 'mongoose'
import agentService from '../agent/agent.service'
import knowledgeBaseModel from '../knowledge/knowledge-base.model'
import knowledgeModel, { IKnowledgeChunk } from '../knowledge/knowledge.model'
import { createEmbedding, AIChatMessage } from '../../shared/utils/ai-client'
import { cosineSimilarity } from '../../shared/utils/similarity'
import { CustomError } from '../../utils/errors'
import { IAgent } from '../agent/agent.model'
import logger from '../../handlers/logger'

type KnowledgeChunkWithScore = IKnowledgeChunk & {
    _id: mongoose.Types.ObjectId
    score: number
}

export type RagContext = {
    chunks: KnowledgeChunkWithScore[]
    contextText: string
    sources: Array<{
        chunkId: string
        sourceName: string
        score: number
        content: string
    }>
}

const buildContextText = (chunks: KnowledgeChunkWithScore[]): string => {
    if (!chunks.length) {
        return 'No relevant data found for this agent.'
    }

    return chunks
        .map((chunk, index) => {
            const sourceName = chunk.sourceName || 'unknown-source'
            return `[#${index + 1} | score:${chunk.score.toFixed(3)} | source:${sourceName}]\n${chunk.content}`
        })
        .join('\n\n')
}

const hasVectorSearchCapability = async (): Promise<boolean> => {
    try {
        const adminDb = mongoose.connection.db?.admin()
        if (!adminDb) {
            return false
        }

        const info = await adminDb.command({ buildInfo: 1 })
        const version = String(info.version || '')
        const [majorRaw, minorRaw] = version.split('.')
        const major = Number(majorRaw)
        const minor = Number(minorRaw)

        if (!Number.isFinite(major)) {
            return false
        }

        return major > 7 || (major === 7 && Number.isFinite(minor) && minor >= 0)
    } catch (_error) {
        return false
    }
}

let vectorSearchCapabilityCache: boolean | null = null

const vectorSearch = async (
    agentId: string,
    knowledgeBaseId: string,
    queryEmbedding: number[],
    limit: number
): Promise<KnowledgeChunkWithScore[]> => {
    const knowledgeBaseObjectId = new mongoose.Types.ObjectId(knowledgeBaseId)
    const agentObjectId = new mongoose.Types.ObjectId(agentId)

    if (vectorSearchCapabilityCache === null) {
        vectorSearchCapabilityCache = await hasVectorSearchCapability()
        logger.info('MongoDB vector search capability detected', {
            meta: {
                enabled: vectorSearchCapabilityCache
            }
        })
    }

    if (vectorSearchCapabilityCache) {
        try {
            const results = (await knowledgeModel.aggregate([
                {
                    $vectorSearch: {
                        index: 'knowledge_embeddings',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 100,
                        limit,
                        filter: {
                            knowledgeBaseId: knowledgeBaseObjectId
                        }
                    }
                },
                {
                    $addFields: {
                        score: { $meta: 'vectorSearchScore' }
                    }
                }
            ])) as KnowledgeChunkWithScore[]

            if (results.length) {
                logger.info('RAG retrieval used vector search', {
                    meta: {
                        knowledgeBaseId,
                        retrieved: results.length
                    }
                })
                return results
            }
        } catch (error) {
            logger.warn('Vector search failed, falling back to cosine similarity', {
                meta: {
                    knowledgeBaseId,
                    error
                }
            })
        }
    }

    const fallbackChunks = (await knowledgeModel.find({
        $or: [{ knowledgeBaseId: knowledgeBaseObjectId }, { agentId: agentObjectId }]
    }).lean()) as Array<
        IKnowledgeChunk & { _id: mongoose.Types.ObjectId }
    >

    if (!fallbackChunks.length) {
        logger.info('No knowledge chunks available for fallback retrieval', {
            meta: {
                knowledgeBaseId,
                agentId
            }
        })
        return []
    }

    const scoredChunks = fallbackChunks
        .map((chunk): KnowledgeChunkWithScore => ({
            ...chunk,
            score: cosineSimilarity(chunk.embedding, queryEmbedding)
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)

    if (!scoredChunks.length || scoredChunks[0].score <= 0) {
        logger.info('No relevant similarity match found', {
            meta: {
                knowledgeBaseId,
                agentId
            }
        })
        return []
    }

    logger.info('RAG retrieval used cosine fallback', {
        meta: {
            knowledgeBaseId,
            agentId,
            retrieved: scoredChunks.length
        }
    })

    return scoredChunks
}

export default {
    buildContext: async (agentId: string, message: string, limit: number = 5): Promise<RagContext> => {
        const agent = await agentService.getAgentPublicById(agentId)
        if (!agent) {
            throw new CustomError('Agent is not found', 404)
        }

        if (!agent.knowledgeBaseId) {
            throw new CustomError('Agent knowledge base is not configured', 422)
        }

        const knowledgeBase = await knowledgeBaseModel.findById(agent.knowledgeBaseId).lean()
        if (!knowledgeBase) {
            throw new CustomError('Knowledge base is not found for this agent', 404)
        }

        const queryEmbedding = await createEmbedding(message)
        logger.info('Query embedding generated successfully', {
            meta: {
                agentId,
                dimension: queryEmbedding.length
            }
        })

        if (!queryEmbedding.length) {
            throw new CustomError('Unable to generate embedding for this query', 422)
        }

        logger.info('RAG context agent details', {
            meta: {
                agentId,
                name: agent.name,
                tone: agent.tone,
                knowledgeBaseId: agent.knowledgeBaseId.toString(),
                knowledgeBase: knowledgeBase,
                instructions: agent.instructions
            }
        })

        const chunks = await vectorSearch(agentId, agent.knowledgeBaseId.toString(), queryEmbedding, limit)
        if (!chunks.length) {
            return {
                chunks,
                contextText: [
                    'No relevant data found for this agent.',
                    `Knowledge base: ${knowledgeBase.name}.`,
                    'Use the agent instructions and company knowledge access rules to provide the most helpful answer possible.',
                    'If the exact answer is unavailable, clearly say so and suggest next steps.'
                ].join(' '),
                sources: []
            }
        }

        return {
            chunks,
            contextText: buildContextText(chunks),
            sources: chunks.map((chunk) => ({
                chunkId: chunk._id?.toString() ?? '',
                sourceName: chunk.sourceName || 'unknown-source',
                score: chunk.score,
                content: chunk.content
            }))
        }
    },

    buildMessages: (
        agent: Pick<IAgent, 'name' | 'tone' | 'instructions'>,
        userMessage: string,
        contextText: string,
        history: AIChatMessage[] = []
    ): AIChatMessage[] => {
        const systemPrompt = [
            `You are ${agent.name}, a ${agent.tone} AI assistant.`,
            `Follow these instructions strictly: ${agent.instructions}`,
            'Use the supplied knowledge context whenever it is relevant.',
            'If the knowledge does not contain the answer, say so clearly and offer the best general guidance you can.'
        ].join('\n')

        const contextMessage = `Knowledge context:\n${contextText}`

        const safeHistory = history.slice(-8)

        return [
            { role: 'system', content: systemPrompt },
            { role: 'system', content: contextMessage },
            ...safeHistory,
            { role: 'user', content: userMessage }
        ]
    }
}




