// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { Socket } from 'net'
import {
    makeLogger as _makeLogger,
    getEnvVar,
    BaseLogParams,
    MakeLoggerParams,
} from '@azure/orbital-integration-common'

export interface LogParams extends BaseLogParams {
    remoteHost?: string
    remotePort?: number
}

export const makeLogger = (params: MakeLoggerParams) =>
    _makeLogger<LogParams>(params)

const defaultSocketTimeoutSeconds = 120

export const getEnv = () => {
    const storageContainer = getEnvVar('CONTACT_DATA_STORAGE_CONTAINER')
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
        host,
        port,
        socketTimeoutSeconds,
    }
}

type RemoteConnection = Pick<Socket, 'remoteAddress' | 'remotePort'>

export const makeRemoteToken = (remote: RemoteConnection) => {
    if (!remote?.remoteAddress || !remote?.remotePort) {
        return null
    }
    return `${remote.remoteAddress}:${remote.remotePort}`
}
