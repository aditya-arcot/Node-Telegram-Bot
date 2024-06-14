import mongoose from 'mongoose'
import { env } from 'process'
import { User } from '../models/user.js'
import { logger } from './logger.js'

export const connectToDatabase = async (): Promise<void> => {
    if (!env['MONGO_DB_URL']) {
        throw new Error('missing mongo url')
    }
    const mongoUrl = env['MONGO_DB_URL']
    try {
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 3000,
        })
        logger.debug('connected to mongo')
    } catch (e) {
        logger.error('failed to connect to mongo')
        throw e
    }
}

export const getUsers = async () => {
    return await User.find().lean()
}

export const getUserById = async (id: number | string) => {
    return await User.findOne({ _id: id }).lean()
}

export const getUserByUsername = async (username: string) => {
    return await User.findOne({ username }).lean()
}

export const updateUserActive = async (
    id: number | string | null,
    isActive: boolean
) => {
    if (!id) throw Error('id cannot be null')
    return await User.updateOne({ _id: id }, { isActive }).lean()
}
