import mongoose, { Schema, Types } from 'mongoose'

export interface IKnowledgeChunk {
    companyId: Types.ObjectId
    knowledgeBaseId: Types.ObjectId
    agentId: Types.ObjectId
    sourceType: 'text' | 'pdf'
    sourceName?: string
    text: string
    content: string
    embedding: number[]
    chunkIndex: number
    pageNumber?: number
    metadata?: Record<string, unknown>
    createdAt?: Date
    updatedAt?: Date
}

const knowledgeSchema = new Schema<IKnowledgeChunk>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        knowledgeBaseId: {
            type: Schema.Types.ObjectId,
            ref: 'KnowledgeBase',
            required: true,
            index: true
        },
        agentId: {
            type: Schema.Types.ObjectId,
            ref: 'Agent',
            required: true,
            index: true
        },
        sourceType: {
            type: String,
            enum: ['text', 'pdf'],
            required: true
        },
        sourceName: {
            type: String,
            default: ''
        },
        text: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        embedding: {
            type: [Number],
            required: true
        },
        chunkIndex: {
            type: Number,
            required: true
        },
        pageNumber: {
            type: Number,
            default: null
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
)

knowledgeSchema.index({ knowledgeBaseId: 1, createdAt: -1 })

export default mongoose.model<IKnowledgeChunk>('KnowledgeChunk', knowledgeSchema)
