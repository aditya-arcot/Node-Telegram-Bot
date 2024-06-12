import { pino } from 'pino'
import { env } from 'process'

export const logger = pino({
    level: env['LOG_LEVEL'] || 'info',
    transport: {
        targets: [
            {
                target: '@logtail/pino',
                level: env['LOG_LEVEL'] || 'info',
                options: {
                    sourceToken: env['LOGTAIL_TOKEN'],
                },
            },
            {
                target: 'pino-pretty',
                level: env['LOG_LEVEL'] || 'info',
                options: {
                    colorize: true,
                },
            },
        ],
    },
})
