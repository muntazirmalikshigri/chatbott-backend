// import mongoose, { Schema, Types } from 'mongoose'

// export interface ICompany {
//     name: string
//     slug: string
//     ownerUserId: Types.ObjectId
//     defaultKnowledgeBaseId?: Types.ObjectId | null
//     description?: string
//     status: 'active' | 'inactive'
//     createdAt?: Date
//     updatedAt?: Date
// }

// const companySchema = new Schema<ICompany>(
//     {
//         name: {
//             type: String,
//             required: true,
//             trim: true,
//             minlength: 2,
//             maxlength: 120
//         },
//         slug: {
//             type: String,
//             required: true,
//             trim: true
//         },
//         ownerUserId: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true,
//             index: true
//         },
//         defaultKnowledgeBaseId: {
//             type: Schema.Types.ObjectId,
//             ref: 'KnowledgeBase',
//             default: null,
//             index: true
//         },
//         description: {
//             type: String,
//             default: ''
//         },
//         status: {
//             type: String,
//             enum: ['active', 'inactive'],
//             default: 'active'
//         }
//     },
//     {
//         timestamps: true
//     }
// )

// companySchema.index({ ownerUserId: 1, slug: 1 }, { unique: true })

// export default mongoose.model<ICompany>('Company', companySchema)



import mongoose, { Schema, Types } from 'mongoose'

export interface IWhatsApp {
    phoneNumberId: string
    accessToken: string
    verifyToken: string
    isActive: boolean
    verifiedAt?: Date | null
}

export interface ICompany {
    name: string
    slug: string
    email?: string | null
    ownerUserId: Types.ObjectId
    defaultKnowledgeBaseId?: Types.ObjectId | null
    description?: string
    status: 'active' | 'inactive'
    whatsapp?: IWhatsApp | null
    createdAt?: Date
    updatedAt?: Date
}

const whatsappSchema = new Schema<IWhatsApp>(
    {
        phoneNumberId: { type: String, required: true, trim: true },
        accessToken: { type: String, required: true, trim: true },
        verifyToken: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: false },
        verifiedAt: { type: Date, default: null }
    },
    { _id: false }
)

const companySchema = new Schema<ICompany>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120
        },
        slug: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            default: null,
            index: {
                unique: true,
                sparse: true
            }
        },
        ownerUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        defaultKnowledgeBaseId: {
            type: Schema.Types.ObjectId,
            ref: 'KnowledgeBase',
            default: null,
            index: true
        },
        description: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        },
        whatsapp: {
            type: whatsappSchema,
            default: null
        }
    },
    {
        timestamps: true
    }
)

companySchema.index({ ownerUserId: 1, slug: 1 }, { unique: true })

export default mongoose.model<ICompany>('Company', companySchema)
