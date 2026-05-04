import dotenvFlow from 'dotenv-flow'
import fs from 'fs'
import path from 'path'

dotenvFlow.config()

const toNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const readFallbackEnvValue = (key: string): string | undefined => {
    const envExamplePath = path.join(process.cwd(), '.env.example')
    if (!fs.existsSync(envExamplePath)) {
        return undefined
    }

    const content = fs.readFileSync(envExamplePath, 'utf8')
    const pattern = new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm')
    const match = content.match(pattern)
    if (!match?.[1]) {
        return undefined
    }

    return match[1].trim().replace(/^['"]|['"]$/g, '')
}

const config = {
    ENV: process.env.ENV ?? process.env.NODE_ENV ?? 'development',
    PORT: toNumber(process.env.PORT, 3000),
    SERVER_URL: process.env.SERVER_URL ?? `http://localhost:${toNumber(process.env.PORT, 3000)}`,

    // Database
    MONGODB_URI: process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? 'mongodb://localhost:27017/base',
    DATABASE_URL: process.env.DATABASE_URL ?? process.env.MONGODB_URI ?? 'mongodb://localhost:27017/base',

    // AI providers
    GROK_API_KEY: process.env.GROK_API_KEY ?? process.env.GROQ_API_KEY ?? readFallbackEnvValue('GROK_API_KEY') ?? readFallbackEnvValue('GROQ_API_KEY') ?? '',
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? process.env.GROK_API_KEY ?? readFallbackEnvValue('GROQ_API_KEY') ?? readFallbackEnvValue('GROK_API_KEY') ?? '',
    GROQ_MODEL: process.env.GROQ_MODEL ?? process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile',
    GROQ_FALLBACK_MODEL: process.env.GROQ_FALLBACK_MODEL ?? 'llama-3.1-8b-instant',
    AI_TEMPERATURE: toNumber(process.env.AI_TEMPERATURE, 0.2),
    KNOWLEDGE_CHUNK_SIZE: toNumber(process.env.KNOWLEDGE_CHUNK_SIZE, 1200),
    KNOWLEDGE_CHUNK_OVERLAP: toNumber(process.env.KNOWLEDGE_CHUNK_OVERLAP, 200),

    // Email
    EMAIL_API_KEY: process.env.EMAIL_SERVICE_API_KEY ?? '',

    // Tokens
    TOKENS: {
        ACCESS: {
            SECRET: process.env.ACCESS_TOKEN_SECRET as string,
            EXPIRY: 3600
        },
        REFRESH: {
            SECRET: process.env.REFRESH_TOKEN_SECRET as string,
            EXPIRY: 3600 * 24 * 365
        }
    }
}

export default config
