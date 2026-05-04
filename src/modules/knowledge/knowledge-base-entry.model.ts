import mongoose, { Schema, Types } from 'mongoose'

export interface IKnowledgeBaseEntry {
    company_id: Types.ObjectId
    agent_id: Types.ObjectId
    source: string
    chunk_index: number
    content: string
    created_at?: Date
}

const knowledgeBaseEntrySchema = new Schema<IKnowledgeBaseEntry>(
    {
        company_id: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        agent_id: {
            type: Schema.Types.ObjectId,
            ref: 'Agent',
            required: true,
            index: true
        },
        source: {
            type: String,
            required: true,
            trim: true
        },
        chunk_index: {
            type: Number,
            required: true,
            min: 0
        },
        content: {
            type: String,
            required: true
        }
    },
    {
        collection: 'knowledge_base',
        timestamps: { createdAt: 'created_at', updatedAt: false }
    }
)

knowledgeBaseEntrySchema.index({ company_id: 1, content: 'text' })
knowledgeBaseEntrySchema.index({ company_id: 1, agent_id: 1, source: 1, chunk_index: 1 })

export default mongoose.model<IKnowledgeBaseEntry>('KnowledgeBaseEntry', knowledgeBaseEntrySchema)
