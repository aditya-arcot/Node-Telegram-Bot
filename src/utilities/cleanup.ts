import mongoose from 'mongoose'
import { Telegraf } from 'telegraf'
import { logger } from './logger.js'

export const configureCleanup = async (bot: Telegraf) => {
    const events = [
        'SIGINT',
        'SIGTERM',
        'SIGQUIT',
        'uncaughtException',
        'unhandledRejection',
    ]
    events.forEach((event) => {
        process.on(event, async (err?: Error) => {
            await runCleanupAndExit(bot, event, err)
        })
    })
    logger.debug('configured cleanup')
}

const runCleanupAndExit = async (bot: Telegraf, event: string, err?: Error) => {
    logger.fatal(err, event)
    try {
        bot.stop()
        logger.debug('stopped bot')
        await mongoose.disconnect()
        logger.debug('disconnected from database')
    } catch (e) {
        logger.fatal(e, 'error during cleanup')
    } finally {
        logger.info(`program exit (${process.pid})`)
        process.exit(1)
    }
}
