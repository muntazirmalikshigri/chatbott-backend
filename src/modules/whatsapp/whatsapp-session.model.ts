import mongoose, { Schema, Types } from 'mongoose'

export interface IWhatsAppSession {
    companyId: Types.ObjectId
    sessionData: string // JSON stringified Baileys auth state
    isConnected: boolean
    phoneNumber?: string
    connectedAt?: Date
    createdAt?: Date
    updatedAt?: Date
}

const whatsappSessionSchema = new Schema<IWhatsAppSession>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            unique: true,
            index: true
        },
        sessionData: {
            type: String,
            default: '{}'
        },
        isConnected: {
            type: Boolean,
            default: false
        },
        phoneNumber: {
            type: String,
            default: null
        },
        connectedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
)

export default mongoose.model<IWhatsAppSession>('WhatsAppSession', whatsappSessionSchema)