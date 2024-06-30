import { env, exit } from 'process'
import { Context, MiddlewareFn, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { Message, Update } from 'telegraf/types'
import { User } from '../models/user.js'
import {
    getUserById,
    getUserByUsername,
    getUsers,
    updateUserActive,
} from './database.js'
import { logger } from './logger.js'

const token = env['BOT_TOKEN']
const admin = env['ADMIN_ID'] ? parseInt(env['ADMIN_ID']) : undefined

export const createBot = (): Telegraf => {
    if (!token) {
        // cleanup not yet configured
        logger.fatal('missing telegram bot token')
        exit(1)
    }
    return new Telegraf(token)
}

export const configureBot = async (bot: Telegraf) => {
    bot.use(authorizeUser)
    await addCommands(bot)
    addTextHandler(bot)
    logger.debug('configured bot')
}

export const startBot = async (bot: Telegraf) => {
    logger.debug('starting bot')
    try {
        await bot.launch()
    } catch (e) {
        logger.error('failed to start bot')
        throw e
    }
}

const authorizeUser: MiddlewareFn<Context> = async (ctx, next) => {
    if (!ctx.from || ctx.updateType !== 'message' || !ctx.message) {
        logger.error('bad context')
        logger.info(ctx)
        return
    }

    const user = getUserStringFromContext(ctx)
    const text = (ctx.message as Message.TextMessage).text
    logUserInfo(user, `message received - ${text}`)

    if (text === '/start') {
        logUserInfo(user, 'skipping auth')
        return await next()
    }

    const existingUser = await getUserById(ctx.from.id)
    if (!existingUser) {
        logUserInfo(user, 'unrecognized user')
        return await sendMessage(ctx, 'Unrecognized - use /start')
    }
    if (!existingUser.isActive) {
        logUserInfo(user, 'inactive user')
        return await sendMessage(ctx, 'Inactive. Wait for admin approval')
    }
    logUserInfo(user, 'active user')
    return await next()
}

const addCommands = async (bot: Telegraf) => {
    await bot.telegram.setMyCommands([
        { command: 'start', description: 'request access' },
        { command: 'status', description: 'bot status' },
        { command: 'users', description: 'list users (admin-only)' },
        {
            command: 'activate',
            description: 'change user to active',
        },
        {
            command: 'deactivate',
            description: 'change user to inactive',
        },
    ])
    addStartHandler(bot)
    addStatusHandler(bot)
    addUsersHandler(bot)
    addActivateHandler(bot, true, 'activate', 'deactivate')
    addActivateHandler(bot, false, 'deactivate', 'activate')
}

const addStartHandler = (bot: Telegraf) => {
    bot.start(async (ctx) => {
        const user = getUserStringFromContext(ctx)
        const existingUser = await getUserById(ctx.from.id)
        if (existingUser) {
            if (existingUser.isActive) {
                logUserInfo(user, 'active user')
                return await sendMessage(ctx, 'Already active')
            } else {
                logUserInfo(user, 'inactive user')
                return await sendMessage(ctx, 'Wait for admin approval')
            }
        }

        if (!checkAdmin(ctx.from.id)) {
            logUserInfo(user, 'new user')
            await createUser(ctx, false)
            logUserInfo(user, 'created new inactive user')
            return await sendMessage(
                ctx,
                'Request created. Wait for admin approval'
            )
        }

        await createUser(ctx, true)
        logUserInfo(user, 'created admin')
        return await sendMessage(ctx, 'Welcome, admin!')
    })
}

const addStatusHandler = (bot: Telegraf) => {
    bot.command('status', async (ctx) => await sendMessage(ctx, 'Alive'))
}

const addUsersHandler = (bot: Telegraf) => {
    bot.command('users', async (ctx) => {
        if (!checkAdmin(ctx.from.id)) {
            return await sendMessage(ctx, 'Admin-only command')
        }

        const users = await getUsers()
        if (!users) {
            return await sendMessage(ctx, 'No users')
        }
        await sendMessage(ctx, '<u>Users</u>', true)
        users.forEach(async (user) => {
            let userStr = `${user.username} - `
            userStr += checkAdmin(user._id) ? 'admin, ' : ''
            userStr += user.isActive ? 'active' : 'inactive'
            await sendMessage(ctx, userStr)
        })
        return
    })
}

const addActivateHandler = (
    bot: Telegraf,
    active: boolean,
    command: string,
    suggestCommand: string
) => {
    const usage = `Usage: /${command} [id | @username]`
    bot.command(command, async (ctx) => {
        const args = ctx.text.split(' ')
        if (args.length !== 2 || !args[1]) {
            return await sendMessage(ctx, usage)
        }

        const user = await getUserWithIdentifier(args[1])
        if (!user) {
            return await sendMessage(ctx, 'No users found with that identifier')
        }

        if (user.isActive === active) {
            await sendMessage(
                ctx,
                `User is already ${active ? 'inactive' : 'active'}`
            )
            return await sendMessage(
                ctx,
                `Did you mean to use the /${suggestCommand} command?`
            )
        }

        await updateUserActive(user._id, !active)
        return await sendMessage(ctx, 'Updated user status')
    })
}

const getUserWithIdentifier = async (id: string) => {
    if (id.startsWith('@')) {
        const username = id.slice(1)
        return await getUserByUsername(username)
    }
    const parsed = parseInt(id)
    if (isNaN(parsed)) return
    return await getUserById(parsed)
}

const addTextHandler = (bot: Telegraf): void => {
    bot.on(message('text'), async (ctx) => {
        return await sendMessage(ctx, ctx.message.text)
    })
}

const createUser = async (
    ctx: Context<Update>,
    active: boolean
): Promise<void> => {
    if (!ctx.from) throw Error('no user info')
    const user = new User({
        _id: ctx.from.id,
        name: `${ctx.from.first_name} ${ctx.from.last_name}`,
        username: ctx.from.username,
        isActive: active,
    })
    await user.save()
}

const sendMessage = async (
    ctx: Context<Update>,
    text: string,
    html: boolean = false
): Promise<Message.TextMessage> => {
    const user = getUserStringFromContext(ctx)
    logUserInfo(user, `sending message - ${text}`)
    if (!html) return await ctx.reply(text)
    return await ctx.replyWithHTML(text)
}

const checkAdmin = (id: number | null): boolean => {
    return !!(id && id === admin)
}

const logUserInfo = (user: string, text: string): void => {
    logger.info(`${user} - ${text}`)
}

const getUserStringFromContext = (ctx: Context<Update>): string => {
    if (!ctx.from) throw Error('no user info')
    return `${ctx.from.username} (${ctx.from.id})`
}
