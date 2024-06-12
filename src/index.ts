import { env } from 'process'
import { configureBot, createBot, startBot } from './utilities/bot.js'
import { configureCleanup } from './utilities/cleanup.js'
import { connectToDatabase } from './utilities/database.js'
import { logger } from './utilities/logger.js'

const prod = env['NODE_ENV'] === 'production'
const version = env['VERSION'] ?? '?'
logger.info(
    `program start - pid ${process.pid}, env ${prod ? 'prod' : 'dev'}, version ${version}`
)

const bot = createBot()
await configureCleanup(bot)
await connectToDatabase()
configureBot(bot)
await startBot(bot)
