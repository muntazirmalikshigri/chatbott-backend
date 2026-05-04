import mongoose, { Schema, Types } from 'mongoose'

export interface ISessionMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
    createdAt?: Date
}

export interface ISession {
    sessionId: string
    companyId: Types.ObjectId
    agentId: Types.ObjectId
    messages: ISessionMessage[]
    lastMessageAt: Date
    createdAt?: Date
    updatedAt?: Date
}

const sessionSchema = new Schema<ISession>(
    {
        sessionId: {
            type: String,
            required: true,
            index: true
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        agentId: {
            type: Schema.Types.ObjectId,
            ref: 'Agent',
            required: true,
            index: true
        },
        messages: [
            {
                role: {
                    type: String,
                    enum: ['system', 'user', 'assistant'],
                    required: true
                },
                content: {
                    type: String,
                    required: true
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        lastMessageAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: true
    }
)

sessionSchema.index({ sessionId: 1, agentId: 1 }, { unique: true })

export default mongoose.model<ISession>('Session', sessionSchema)
