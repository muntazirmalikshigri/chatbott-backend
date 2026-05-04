import { createEmbedding } from '../../shared/utils/ai-client'
import logger from '../../handlers/logger'

export default {
    createEmbedding: async (input: string): Promise<number[]> => {
        const embedding = await createEmbedding(input)
        logger.info('Embedding generated successfully', {
            meta: {
                dimension: embedding.length,
                preview: input.slice(0, 80)
            }
        })
        return embedding
    }
}
