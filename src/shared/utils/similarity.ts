export const cosineSimilarity = (left: number[], right: number[]): number => {
    const length = Math.min(left.length, right.length)
    if (!length) {
        return 0
    }

    let dotProduct = 0
    let leftMagnitude = 0
    let rightMagnitude = 0

    for (let index = 0; index < length; index += 1) {
        const leftValue = left[index]
        const rightValue = right[index]

        dotProduct += leftValue * rightValue
        leftMagnitude += leftValue * leftValue
        rightMagnitude += rightValue * rightValue
    }

    if (leftMagnitude === 0 || rightMagnitude === 0) {
        return 0
    }

    return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))
}
