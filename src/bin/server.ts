// import 'dotenv-flow/config'
// import app from '../app'
// import { bootstrap } from '../bootstrap'
// import config from '../config/config'
// import logger from '../handlers/logger'

// const maskApiKey = (value: string | undefined): string => {
//     if (!value) {
//         return 'missing'
//     }

//     if (value.length <= 8) {
//         return 'set'
//     }

//     return `${value.slice(0, 4)}...${value.slice(-4)}`
// }

// logger.info('AI provider environment loaded', {
//     meta: {
//         grokKey: maskApiKey(process.env.GROK_API_KEY ?? process.env.GROQ_API_KEY ?? config.GROK_API_KEY ?? config.GROQ_API_KEY),
//         groqModel: config.GROQ_MODEL,
//         groqFallbackModel: config.GROQ_FALLBACK_MODEL,
//         grokKeySource: process.env.GROK_API_KEY ? 'runtime-env' : process.env.GROQ_API_KEY ? 'runtime-env-legacy' : 'env-example-fallback'
//     }
// })

// const server = app.listen(config.PORT)
// void (async () => {
//     try {
//         await bootstrap().then(() => {
//             logger.info(`Application started on port ${config.PORT}`, {
//                 meta: { SERVER_URL: config.SERVER_URL }
//             })
//         })
//     } catch (error) {
//         logger.error(`Error starting server:`, { meta: error })
//         server.close((err) => {
//             if (err) logger.error(`error`, { meta: error })

//             process.exit(1)
//         })
//     }
// })()



import 'dotenv-flow/config'
import app from '../app'
import { bootstrap } from '../bootstrap'
import config from '../config/config'
import logger from '../handlers/logger'

// ADD THIS - Force console logs
console.log('=== SERVER STARTING ===')
console.log('PORT from config:', config.PORT)
console.log('process.env.PORT:', process.env.PORT)

const maskApiKey = (value: string | undefined): string => {
    if (!value) {
        return 'missing'
    }
    if (value.length <= 8) {
        return 'set'
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`
}

logger.info('AI provider environment loaded', {
    meta: {
        grokKey: maskApiKey(process.env.GROK_API_KEY ?? process.env.GROQ_API_KEY ?? config.GROK_API_KEY ?? config.GROQ_API_KEY),
        groqModel: config.GROQ_MODEL,
        groqFallbackModel: config.GROQ_FALLBACK_MODEL,
        grokKeySource: process.env.GROK_API_KEY ? 'runtime-env' : process.env.GROQ_API_KEY ? 'runtime-env-legacy' : 'env-example-fallback'
    }
})

console.log('Attempting to start server on port:', config.PORT)

const server = app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`✅ Server started on port ${config.PORT}`)
    logger.info(`Server listening on port ${config.PORT}`)
})

void (async () => {
    try {
        console.log('Running bootstrap...')
        await bootstrap()
        console.log('Bootstrap completed successfully')
        logger.info(`Application started on port ${config.PORT}`, {
            meta: { SERVER_URL: config.SERVER_URL }
        })
    } catch (error) {
        console.error('❌ Bootstrap error:', error)
        logger.error(`Error starting server:`, { meta: error })
        server.close((err) => {
            if (err) logger.error(`error`, { meta: error })
            process.exit(1)
        })
    }
})()
