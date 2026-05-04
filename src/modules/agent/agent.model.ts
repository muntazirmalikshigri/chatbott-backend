import mongoose, { Schema, Types } from 'mongoose'

export interface IAgent {
    name: string
    companyId: Types.ObjectId
    knowledgeBaseId: Types.ObjectId
    tone: 'friendly' | 'formal'
    instructions: string
    isActive: boolean
    createdAt?: Date
    updatedAt?: Date
}

const agentSchema = new Schema<IAgent>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120
        },
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
        tone: {
            type: String,
            enum: ['friendly', 'formal'],
            default: 'friendly',
            required: true
        },
        instructions: {
            type: String,
            required: true,
            trim: true,
            default: ''
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

agentSchema.index({ companyId: 1, name: 1 }, { unique: true })

export default mongoose.model<IAgent>('Agent', agentSchema)
