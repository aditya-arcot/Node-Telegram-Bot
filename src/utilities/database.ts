import mongoose from 'mongoose'
import { env } from 'process'
import { logger } from './logger.js'

export const connectToDatabase = async (): Promise<void> => {
    if (!env['MONGO_DB_URL']) {
        throw new Error('missing mongo url')
    }
    const mongoUrl = env['MONGO_DB_URL']

    logger.debug(`connecting to mongo (${mongoUrl})`)
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
