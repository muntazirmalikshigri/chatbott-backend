import mongoose, { Schema, Types } from 'mongoose'

export interface IKnowledgeBase {
    companyId: Types.ObjectId
    name: string
    description?: string
    isActive: boolean
    createdAt?: Date
    updatedAt?: Date
}

const knowledgeBaseSchema = new Schema<IKnowledgeBase>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
            unique: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120
        },
        description: {
            type: String,
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

knowledgeBaseSchema.index({ companyId: 1 }, { unique: true })

export default mongoose.model<IKnowledgeBase>('KnowledgeBase', knowledgeBaseSchema)
