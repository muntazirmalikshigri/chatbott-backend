import config from '../../config/config'
import logger from '../../handlers/logger'
import { CustomError } from '../../utils/errors'

export type AIChatMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}

type AIProviderResult = {
    content: string
    provider: 'groq'
}

type ChatCompletionParams = {
    model: string
    messages: AIChatMessage[]
    temperature: number
}

type GroqClientConfig = {
    apiKey: string
    baseUrl?: string
}

const EMBEDDING_DIMENSION = 1536

const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant'
const ALLOWED_GROQ_MODELS = new Set(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'])

const normalizeGroqModel = (value: string | undefined): string => {
    const model = (value || '').trim()
    if (ALLOWED_GROQ_MODELS.has(model)) {
        return model
    }

    if (model) {
        logger.warn('Unsupported Groq model detected, using default model instead', {
            meta: {
                providedModel: model,
                fallbackModel: GROQ_DEFAULT_MODEL
            }
        })
    }

    return GROQ_DEFAULT_MODEL
}

class Groq {
    public chat: {
        completions: {
            create: (params: ChatCompletionParams) => Promise<{ choices?: Array<{ message?: { content?: string } }> }>
        }
    }

    private readonly apiKey: string
    private readonly baseUrl: string

    constructor(config: GroqClientConfig) {
        this.apiKey = config.apiKey
        this.baseUrl = config.baseUrl ?? 'https://api.groq.com/openai/v1'
        this.chat = {
            completions: {
                create: async (params: ChatCompletionParams) => this.createCompletion(params)
            }
        }
    }

    private async createCompletion(params: ChatCompletionParams): Promise<{ choices?: Array<{ message?: { content?: string } }> }> {
        logger.info('Groq provider request started', {
            meta: {
                model: params.model
            }
        })

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        })

        if (!response.ok) {
            const errorText = await parseApiError(response)
            logger.warn('Groq provider returned non-OK response', {
                meta: {
                    model: params.model,
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                }
            })
            throw new Error(errorText)
        }

        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }

        logger.info('Groq provider response received', {
            meta: {
                hasChoices: Boolean(payload.choices?.length)
            }
        })

        return payload
    }
}

const normalizeVector = (vector: number[]): number[] => {
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
    if (magnitude === 0) {
        return vector
    }

    return vector.map((value) => value / magnitude)
}

const createFallbackEmbedding = (input: string): number[] => {
    const vector = new Array(EMBEDDING_DIMENSION).fill(0)
    const tokens = input.toLowerCase().match(/[a-z0-9]+/g) ?? []

    tokens.forEach((token, tokenIndex) => {
        let hash = 0

        for (let index = 0; index < token.length; index += 1) {
            hash = (hash * 31 + token.charCodeAt(index)) % EMBEDDING_DIMENSION
        }

        vector[hash] += 1 / (tokenIndex + 1)
    })

    return normalizeVector(vector)
}

const parseApiError = async (response: globalThis.Response): Promise<string> => {
    const body = await response.text()
    if (!body) {
        return `AI provider request failed with status ${response.status}`
    }

    return body.slice(0, 500)
}

export const createEmbedding = async (input: string): Promise<number[]> => {
    const trimmedInput = input.trim()
    if (!trimmedInput) {
        return createFallbackEmbedding('empty')
    }

    return createFallbackEmbedding(trimmedInput)
}

export const generateChatCompletion = async (messages: AIChatMessage[]): Promise<AIProviderResult> => {
    const groqApiKey = process.env.GROK_API_KEY ?? process.env.GROQ_API_KEY ?? config.GROK_API_KEY ?? config.GROQ_API_KEY
    const requestedModel = normalizeGroqModel(config.GROQ_MODEL)
    const fallbackModel = normalizeGroqModel(config.GROQ_FALLBACK_MODEL || GROQ_FALLBACK_MODEL)
    const candidateModels = Array.from(new Set([requestedModel, fallbackModel]))

    logger.info('AI provider flow started', {
        meta: {
            hasGroqApiKey: Boolean(groqApiKey),
            groqApiKeyLoaded: Boolean(groqApiKey),
            requestedModel,
            fallbackModel,
            candidateModels
        }
    })

    if (!groqApiKey) {
        throw new CustomError('GROK_API_KEY is missing', 500)
    }

    const groq = new Groq({ apiKey: groqApiKey })

    for (const model of candidateModels) {
        try {
            logger.info('Groq request attempting model', {
                meta: {
                    model
                }
            })

            const response = await groq.chat.completions.create({
                model,
                messages,
                temperature: config.AI_TEMPERATURE
            })

            const content = response.choices?.[0]?.message?.content?.trim()
            if (content) {
                logger.info('Groq provider request succeeded', {
                    meta: {
                        model
                    }
                })

                return {
                    content,
                    provider: 'groq'
                }
            }

            logger.warn('Groq provider returned empty content', {
                meta: {
                    model
                }
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const isModelDecommissioned =
                errorMessage.includes('model_decommissioned') || errorMessage.toLowerCase().includes('decommissioned')

            logger.error('Groq request failed', {
                meta: {
                    model,
                    error: errorMessage
                }
            })

            if (isModelDecommissioned) {
                logger.error('Groq model outdated, update required', {
                    meta: {
                        model
                    }
                })

                if (model !== candidateModels[candidateModels.length - 1]) {
                    continue
                }

                throw new CustomError('Groq model outdated, update required', 502)
            }

            throw new CustomError(`Groq request failed for model ${model}: ${errorMessage}`, 502)
        }
    }

    throw new CustomError('Groq request did not return a response', 502)
}
