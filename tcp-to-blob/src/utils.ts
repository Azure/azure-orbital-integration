// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { Socket } from 'net'

export const getEnvVar = (key: string) => {
    const val = process.env[key]
    if (!val) {
        throw new Error(`[init] Must populate "${key}" env var.`)
    }
    return val
}

export interface LogParams {
    event: string
    remoteHost?: string
    remotePort?: number
    error?: { message: string }
    message: string

    [key: string]: any
}

export interface EventLogger {
    info(params: LogParams): void

    warn(params: LogParams): void

    error(params: LogParams): void
}

type ConsoleLoggerFx = (message?: any, ...optionalParams: any[]) => void
export const makeLogger = ({
    subsystem,
}: {
    subsystem: string
}): EventLogger => {
    const doLog = (log: ConsoleLoggerFx, { error, ...params }: LogParams) => {
        log(
            JSON.stringify({
                subsystem,
                ...params,
                error: error ? error.message ?? error.toString() : undefined,
            })
        )
    }
    return {
        info: (params: LogParams) => {
            doLog(console.info, params)
        },
        warn: (params: LogParams) => {
            doLog(console.warn, params)
        },
        error: (params: LogParams) => {
            doLog(console.error, params)
        },
    }
}

const defaultSocketTimeoutSeconds = 60

export const getEnv = () => {
    const storageContainer = getEnvVar('CONTACT_DATA_STORAGE_CONTAINER')
    const connectionString = getEnvVar('CONTACT_DATA_STORAGE_CONNECTION_STRING')
    const host = getEnvVar('HOST')
    const port = +getEnvVar('PORT')
    const socketTimeoutSeconds = +(
        process.env.SOCKET_TIMEOUT_SECONDS ?? defaultSocketTimeoutSeconds
    )
    if (isNaN(socketTimeoutSeconds)) {
        const errMessage =
            '[init] Env var "SOCKET_TIMEOUT_SECONDS" must be a number.'
        throw new Error(errMessage)
    }
    if (isNaN(port)) {
        const errMessage = '[init] Env var "PORT" must be a number.'
        throw new Error(errMessage)
    }

    if (!host) {
        const errMessage = 'Must populate "HOST" env var.'
        console.info(` ${new Date().toISOString()} [init] ${errMessage}".`)
        throw new Error(errMessage)
    }
    if (!port) {
        const errMessage = 'Must populate "PORT" env var.'
        console.info(` ${new Date().toISOString()} [init] ${errMessage}".`)
        throw new Error(errMessage)
    }

    return {
        storageContainer,
        connectionString,
        host,
        port,
        socketTimeoutSeconds,
    }
}

const defaultSleepMillis = 1_000 // 1 second

export const sleep = async (sleepMillis = defaultSleepMillis) => {
    return new Promise((resolve) => {
        setTimeout(resolve, sleepMillis)
    })
}

type RemoteConnection = Pick<Socket, 'remoteAddress' | 'remotePort'>

export const makeRemoteToken = (remote: RemoteConnection) => {
    if (!remote?.remoteAddress || !remote?.remotePort) {
        return null
    }
    return `${remote.remoteAddress}:${remote.remotePort}`
}
