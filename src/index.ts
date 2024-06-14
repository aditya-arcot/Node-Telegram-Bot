import { env } from 'process'
import { configureBot, createBot, startBot } from './utilities/bot.js'
import { configureCleanup } from './utilities/cleanup.js'
import { connectToDatabase } from './utilities/database.js'
import { logger } from './utilities/logger.js'

logger.info(
    {
        env: env['NODE_ENV'],
        version: env['VERSION'],
    },
    `start ${process.pid}`
)

const bot = createBot()
await configureCleanup(bot)
await connectToDatabase()
await configureBot(bot)
await startBot(bot)
