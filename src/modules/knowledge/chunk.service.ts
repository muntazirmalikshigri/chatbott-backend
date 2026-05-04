import config from '../../config/config'
import { splitIntoChunks } from '../../shared/utils/chunk'

export default {
    splitText: (text: string) => {
        return splitIntoChunks(text, config.KNOWLEDGE_CHUNK_SIZE, config.KNOWLEDGE_CHUNK_OVERLAP)
    }
}
