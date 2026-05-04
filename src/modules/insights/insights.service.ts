import sessionModel from '../session/session.model'
import { generateChatCompletion } from '../../shared/utils/ai-client'
import logger from '../../handlers/logger'

export type InsightsResult = {
    companyId: string
    generatedAt: Date
    overview: {
        totalConversations: number
        totalMessages: number
        avgMessagesPerConversation: number
        activeUsers: number
        resolutionRate: number
    }
    topQuestions: Array<{
        question: string
        count: number
    }>
    missingKnowledge: Array<{
        question: string
        frequency: number
    }>
    peakHours: Array<{
        hour: number
        count: number
    }>
    recentConversations: Array<{
        sessionId: string
        messageCount: number
        lastMessageAt: Date
        preview: string
    }>
    aiRecommendations: string
}

// Extract user messages from sessions
const extractUserMessages = (sessions: any[]): string[] => {
    const messages: string[] = []
    for (const session of sessions) {
        for (const msg of session.messages) {
            if (msg.role === 'user') {
                messages.push(msg.content.trim())
            }
        }
    }
    return messages
}

// Detect missing knowledge — when assistant says it doesn't know
const detectMissingKnowledge = (sessions: any[]): Array<{ question: string; frequency: number }> => {
    const missingMap = new Map<string, number>()
    const noAnswerPhrases = [
        "i don't have this information",
        "i don't know",
        "not in my knowledge",
        "unable to find",
        "no information",
        "i cannot find",
        "not available in",
        "outside my knowledge",
    ]

    for (const session of sessions) {
        const messages = session.messages
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i]
            if (msg.role === 'assistant') {
                const lower = msg.content.toLowerCase()
                const isUnanswered = noAnswerPhrases.some(phrase => lower.includes(phrase))
                if (isUnanswered && i > 0 && messages[i - 1]?.role === 'user') {
                    const question = messages[i - 1].content.trim()
                    missingMap.set(question, (missingMap.get(question) ?? 0) + 1)
                }
            }
        }
    }

    return Array.from(missingMap.entries())
        .map(([question, frequency]) => ({ question, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10)
}

// Find top questions using keyword frequency
const findTopQuestions = (userMessages: string[]): Array<{ question: string; count: number }> => {
    const questionMap = new Map<string, number>()

    for (const msg of userMessages) {
        // Normalize — lowercase, trim
        const normalized = msg.toLowerCase().trim().slice(0, 200)
        if (normalized.length < 5) continue
        questionMap.set(normalized, (questionMap.get(normalized) ?? 0) + 1)
    }

    // Sort by frequency
    return Array.from(questionMap.entries())
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
}

// Calculate peak hours
const calculatePeakHours = (sessions: any[]): Array<{ hour: number; count: number }> => {
    const hourMap = new Map<number, number>()

    for (const session of sessions) {
        const hour = new Date(session.lastMessageAt).getHours()
        hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1)
    }

    return Array.from(hourMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
}

// Calculate resolution rate
const calculateResolutionRate = (sessions: any[]): number => {
    if (!sessions.length) return 0

    const noAnswerPhrases = [
        "i don't have this information",
        "i don't know",
        "not in my knowledge",
        "unable to find",
        "no information",
    ]

    let resolved = 0
    for (const session of sessions) {
        const assistantMessages = session.messages.filter((m: any) => m.role === 'assistant')
        const hasUnresolved = assistantMessages.some((m: any) =>
            noAnswerPhrases.some(phrase => m.content.toLowerCase().includes(phrase))
        )
        if (!hasUnresolved && assistantMessages.length > 0) resolved++
    }

    return Math.round((resolved / sessions.length) * 100)
}

// Generate AI recommendations using Grok
const generateAIRecommendations = async (
    topQuestions: Array<{ question: string; count: number }>,
    missingKnowledge: Array<{ question: string; frequency: number }>,
    resolutionRate: number,
    totalConversations: number
): Promise<string> => {
    try {
        const prompt = `You are a business intelligence assistant analyzing chatbot performance data.

Here is the data:
- Total conversations: ${totalConversations}
- Resolution rate: ${resolutionRate}%
- Top questions asked by users: ${topQuestions.slice(0, 5).map(q => `"${q.question}" (${q.count}x)`).join(', ')}
- Questions the chatbot could NOT answer: ${missingKnowledge.slice(0, 5).map(q => `"${q.question}" (${q.frequency}x)`).join(', ') || 'None detected'}

Provide 3-5 specific, actionable recommendations to improve the chatbot's performance. Be concise and practical. Format as a numbered list.`

        const response = await generateChatCompletion([
            { role: 'user', content: prompt }
        ])

        return response.content
    } catch (error) {
        logger.error('AI recommendations generation failed', {
            meta: { error: error instanceof Error ? error.message : String(error) }
        })
        return 'Unable to generate AI recommendations at this time. Please try again later.'
    }
}

export default {
    generateInsights: async (companyId: string): Promise<InsightsResult> => {
        logger.info('Generating insights for company', { meta: { companyId } })

        // Fetch all sessions for this company
        const sessions = await sessionModel
            .find({ companyId })
            .sort({ lastMessageAt: -1 })
            .limit(500) // Limit to last 500 sessions for performance
            .lean()

        // Overview stats
        const totalConversations = sessions.length
        const totalMessages = sessions.reduce((sum, s) => sum + s.messages.filter(m => m.role === 'user').length, 0)
        const avgMessagesPerConversation = totalConversations > 0
            ? Math.round(totalMessages / totalConversations)
            : 0

        // Unique users (by sessionId as proxy)
        const activeUsers = new Set(sessions.map(s => s.sessionId)).size

        // Extract user messages
        const userMessages = extractUserMessages(sessions)

        // Top questions
        const topQuestions = findTopQuestions(userMessages)

        // Missing knowledge
        const missingKnowledge = detectMissingKnowledge(sessions)

        // Peak hours
        const peakHours = calculatePeakHours(sessions)

        // Resolution rate
        const resolutionRate = calculateResolutionRate(sessions)

        // Recent conversations preview
        const recentConversations = sessions.slice(0, 5).map(s => ({
            sessionId: s.sessionId,
            messageCount: s.messages.filter(m => m.role === 'user').length,
            lastMessageAt: s.lastMessageAt,
            preview: s.messages.find(m => m.role === 'user')?.content?.slice(0, 100) ?? ''
        }))

        // AI Recommendations
        const aiRecommendations = await generateAIRecommendations(
            topQuestions,
            missingKnowledge,
            resolutionRate,
            totalConversations
        )

        logger.info('Insights generated successfully', {
            meta: {
                companyId,
                totalConversations,
                topQuestionsCount: topQuestions.length,
                missingKnowledgeCount: missingKnowledge.length,
            }
        })

        return {
            companyId,
            generatedAt: new Date(),
            overview: {
                totalConversations,
                totalMessages,
                avgMessagesPerConversation,
                activeUsers,
                resolutionRate
            },
            topQuestions,
            missingKnowledge,
            peakHours,
            recentConversations,
            aiRecommendations
        }
    }
}