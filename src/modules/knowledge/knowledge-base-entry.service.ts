import mongoose from 'mongoose'
import knowledgeBaseEntryModel, { IKnowledgeBaseEntry } from './knowledge-base-entry.model'
import { normalizeText, splitIntoWordChunks } from '../../shared/utils/chunk'
import { CustomError } from '../../utils/errors'

export type KnowledgeBaseSearchResult = IKnowledgeBaseEntry & {
    _id: mongoose.Types.ObjectId
    relevance?: number
}

const MAX_PDF_CHUNK_WORDS = 1000

const tokenize = (value: string): string[] =>
    normalizeText(value)
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter(Boolean) ?? []

const scoreChunk = (queryTokens: string[], content: string): number => {
    if (!queryTokens.length || !content.trim()) {
        return 0
    }

    const contentTokens = new Set(tokenize(content))
    let score = 0

    for (const token of queryTokens) {
        if (contentTokens.has(token)) {
            score += 1
        }
    }

    return score
}

export default {
    splitPdfText: (text: string): string[] => splitIntoWordChunks(text, MAX_PDF_CHUNK_WORDS),

    storeChunks: async (
        companyId: string,
        agentId: string,
        source: string,
        chunks: string[]
    ): Promise<KnowledgeBaseSearchResult[]> => {
        if (!chunks.length) {
            throw new CustomError('No readable content was found for the knowledge upload', 422)
        }

        const documents = chunks.map((content, chunkIndex) => ({
            company_id: new mongoose.Types.ObjectId(companyId),
            agent_id: new mongoose.Types.ObjectId(agentId),
            source,
            chunk_index: chunkIndex,
            content: normalizeText(content)
        }))

        await knowledgeBaseEntryModel.insertMany(documents)

        return documents as KnowledgeBaseSearchResult[]
    },

    searchChunks: async (
        companyId: string,
        query: string,
        limit: number = 5,
        agentId?: string
    ): Promise<KnowledgeBaseSearchResult[]> => {
        const normalizedQuery = normalizeText(query)
        if (!normalizedQuery) {
            return []
        }

        const companyObjectId = new mongoose.Types.ObjectId(companyId)
        const agentObjectId = agentId ? new mongoose.Types.ObjectId(agentId) : null
        const queryTokens = tokenize(normalizedQuery)

        const textSearchQuery: Record<string, unknown> = {
            company_id: companyObjectId,
            $text: { $search: normalizedQuery }
        }

        if (agentObjectId) {
            textSearchQuery.agent_id = agentObjectId
        }

        try {
            const textResults = (await knowledgeBaseEntryModel
                .find(textSearchQuery, {
                    score: { $meta: 'textScore' }
                })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
                .lean()) as KnowledgeBaseSearchResult[]

            if (textResults.length) {
                return textResults
            }
        } catch (_error) {
            // If the text index is unavailable or MongoDB rejects the query shape,
            // fall back to in-memory scoring over the company knowledge chunks.
        }

        const fallbackQuery: Record<string, unknown> = {
            company_id: companyObjectId
        }

        if (agentObjectId) {
            fallbackQuery.agent_id = agentObjectId
        }

        const allChunks = (await knowledgeBaseEntryModel.find(fallbackQuery).lean()) as KnowledgeBaseSearchResult[]
        if (!allChunks.length) {
            return []
        }

        return allChunks
            .map((chunk) => ({
                ...chunk,
                relevance: scoreChunk(queryTokens, chunk.content)
            }))
            .sort((left, right) => (right.relevance ?? 0) - (left.relevance ?? 0))
            .filter((chunk) => (chunk.relevance ?? 0) > 0)
            .slice(0, limit)
    }
}
