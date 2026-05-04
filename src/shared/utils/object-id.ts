import mongoose from 'mongoose'

export const isValidObjectId = (value: string): boolean => mongoose.isValidObjectId(value)

export const toObjectId = (value: string): mongoose.Types.ObjectId => {
    if (!isValidObjectId(value)) {
        throw new Error(`Invalid identifier: ${value}`)
    }

    return new mongoose.Types.ObjectId(value)
}
