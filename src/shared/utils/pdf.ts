import { CustomError } from '../../utils/errors'

type PdfParseResult = {
    text?: string
}

const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<PdfParseResult>

const cleanPdfText = (value: string): string =>
    value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\u0000/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[^\S\n]+/g, ' ')
        .trim()

export const extractTextFromPdfBuffer = async (buffer: Buffer): Promise<string> => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new CustomError('PDF file buffer is required', 422)
    }

    try {
        const parsed = await pdfParse(buffer)
        const extractedText = cleanPdfText(parsed.text ?? '')

        if (!extractedText) {
            throw new CustomError('Could not extract usable text from the PDF file', 422)
        }

        return extractedText
    } catch (error) {
        if (error instanceof CustomError) {
            throw error
        }

        throw new CustomError('Failed to extract text from the PDF file', 422)
    }
}

export const normalizeExtractedText = cleanPdfText
