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
    return User.find().lean()
}

export const getUserById = async (id: number) => {
    return User.findOne({ _id: id }).lean()
}

export const getUserByUsername = (username: string) => {
    return User.findOne({ username }).lean()
}

export const updateUserActive = (id: number | null, isActive: boolean) => {
    if (!id) throw Error('id cannot be null')
    return User.updateOne({ _id: id }, { isActive })
}
