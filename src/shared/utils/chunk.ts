export const normalizeText = (value: string): string => value.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim()

export const splitIntoChunks = (value: string, chunkSize: number, overlap: number): string[] => {
    const text = normalizeText(value)
    if (!text) {
        return []
    }

    const safeChunkSize = Math.max(200, chunkSize)
    const safeOverlap = Math.min(Math.max(0, overlap), safeChunkSize - 1)
    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
        let end = Math.min(start + safeChunkSize, text.length)

        if (end < text.length) {
            const boundary = text.lastIndexOf(' ', end)
            if (boundary > start + Math.floor(safeChunkSize * 0.6)) {
                end = boundary
            }
        }

        const chunk = text.slice(start, end).trim()
        if (chunk) {
            chunks.push(chunk)
        }

        if (end >= text.length) {
            break
        }

        const nextStart = Math.max(end - safeOverlap, start + 1)
        start = nextStart
    }

    return chunks
}

export const splitIntoWordChunks = (value: string, maxWords: number): string[] => {
    const text = normalizeText(value)
    if (!text) {
        return []
    }

    const safeMaxWords = Math.max(1, maxWords)
    const words = text.split(/\s+/).filter(Boolean)
    const chunks: string[] = []

    for (let index = 0; index < words.length; index += safeMaxWords) {
        const chunk = words.slice(index, index + safeMaxWords).join(' ').trim()
        if (chunk) {
            chunks.push(chunk)
        }
    }

    return chunks
}
