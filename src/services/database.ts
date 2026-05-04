import mongoose from 'mongoose'
import config from '../config/config'
import logger from '../handlers/logger'

export default {
    connect: async () => {
        const connectionUri = config.MONGODB_URI || config.DATABASE_URL || 'mongodb://localhost:27017/base'
        const maxAttempts = 5
        let lastError: unknown = null

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                mongoose.set('strictQuery', true)
                await mongoose.connect(connectionUri, {
                    serverSelectionTimeoutMS: 5000,
                    connectTimeoutMS: 5000
                })

                return mongoose.connection
            } catch (error) {
                lastError = error
                logger.warn(`MongoDB connection attempt ${attempt} failed`, {
                    meta: {
                        attempt,
                        maxAttempts,
                        uri: connectionUri,
                        error
                    }
                })

                if (attempt < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
                }
            }
        }

        throw lastError ?? new Error('Unable to connect to local MongoDB')
    }
}
