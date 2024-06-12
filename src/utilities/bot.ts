import { env, exit } from 'process'
import { Context, MiddlewareFn, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { Message, Update } from 'telegraf/types'
import { User, findUserById } from '../models/user.js'
import { logger } from './logger.js'

export const createBot = (): Telegraf => {
    const token = env['BOT_TOKEN']
    if (!token) {
        // cleanup not yet configured
        logger.fatal('missing telegram bot token')
        exit(1)
    }
    return new Telegraf(token)
}

export const configureBot = (bot: Telegraf) => {
    bot.use(handleMessage)

    bot.command('start', async (ctx) => {
        const user = getUserString(ctx)
        const existingUser = await findUserById(ctx.from.id)
        if (existingUser) {
            logUserInfo(user, 'active user')
            return await sendMessage(ctx, 'You already have access')
        }

        const rootUsername = env['ROOT_USER']
        if (!rootUsername || ctx.from.username !== rootUsername) {
            logUserInfo(user, 'new sign up attempted')
            return await sendMessage(
                ctx,
                `Provide admin with your info - ${user}`
            )
        }

        const admin = new User({
            _id: ctx.from.id,
            name: `${ctx.from.first_name} ${ctx.from.last_name}`,
            username: ctx.from.username,
        })
        await admin.save()
        logUserInfo(user, 'created admin')
        return await sendMessage(ctx, 'Welcome, admin!')
    })

    bot.command('status', async (ctx) => await sendMessage(ctx, 'Alive'))

    bot.on(message('text'), async (ctx) => {
        return await sendMessage(ctx, ctx.message.text)
    })

    logger.debug('configured bot')
}

const handleMessage: MiddlewareFn<Context> = async (ctx, next) => {
    if (!ctx.from || ctx.updateType !== 'message' || !ctx.message) {
        logger.error('badly-formed context')
        logger.info(ctx)
        return
    }

    const user = getUserString(ctx)
    const text = (ctx.message as Message.TextMessage).text
    logUserInfo(user, `message received - ${text}`)

    if (text === '/start') {
        logUserInfo(user, 'skipping auth')
        return await next()
    }

    const existingUser = await findUserById(ctx.from.id)
    if (!existingUser) {
        logUserInfo(user, 'unrecognized user')
        return await sendMessage(ctx, 'Unrecognized - use /start')
    }
    logUserInfo(user, 'active user')
    return await next()
}

const logUserInfo = (user: string, text: string) => {
    logger.info(`${user} - ${text}`)
}

const getUserString = (ctx: Context<Update>) => {
    if (!ctx.from) throw Error('context does not contain user info')
    return `${ctx.from.username} (${ctx.from.id})`
}

const sendMessage = async (ctx: Context<Update>, text: string) => {
    const user = getUserString(ctx)
    logUserInfo(user, `sending message - ${text}`)
    return await ctx.reply(text)
}

export const startBot = async (bot: Telegraf) => {
    try {
        await bot.launch()
        logger.debug('started bot')
    } catch (e) {
        logger.error('failed to start bot')
        throw e
    }
}
