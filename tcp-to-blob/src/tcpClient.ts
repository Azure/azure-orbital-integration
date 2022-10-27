// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { Socket } from 'net'
import { LogParams, makeLogger } from './utils'
import {
    EventLogger,
    sleep,
    BaseLogParams,
} from '@azure/orbital-integration-common'

export const linePrefix = 'Hello from Client'
export interface SendDataParams {
    numLines: number
    host: string
    port: number
    logger: EventLogger<LogParams>
}

export interface MakeSocketParams {
    host: string
    port: number
    logger: EventLogger<BaseLogParams>
}

export const makeSocket = ({ host, port, logger }: MakeSocketParams) => {
    const client = new Socket({
        allowHalfOpen: true,
    })

    logger.info({
        event: 'init',
        message: 'Establishing connection.',
    })

    client.setTimeout(30_000)
    const socket = client.connect(port, host)
    return socket
}

export const sendData = async ({
    numLines,
    host,
    port,
    logger,
}: SendDataParams) => {
    let isOkToWrite = true
    let linesWritten = 0
    const baseParams = {
        host,
        port,
        linesWritten,
        numLines,
    }

    const socket = makeSocket({
        host,
        port,
        logger,
    })

    const asyncWrite = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            isOkToWrite = socket.write(makeBuffer(), (err) => {
                if (err) {
                    reject(err)
                }
                resolve()
            })
        })
    }

    socket.on('drain', () => {
        isOkToWrite = true
        logger.info({
            event: 'drain',
            message: 'Buffer empty, continuing.',
            ...baseParams,
        })
    })

    socket.on('connect', async () => {
        logger.info({
            event: 'connect',
            message: 'Connected.',
            ...baseParams,
        })
        while (linesWritten < numLines) {
            await asyncWrite()
            while (!isOkToWrite) {
                await sleep()
            }
        }

        socket.end()
        logger.info({
            event: 'complete',
            message: '✅ Finished sending text data to TCP socket.',
            ...baseParams,
        })
    })

    socket.on('data', async (data) => {
        logger.info({
            event: 'server-message',
            message: 'Server says: ' + data.toString(),
            ...baseParams,
        })
    })

    socket.on('close', function () {
        logger.info({
            event: 'close',
            message: 'Connection was closed.',
            ...baseParams,
        })
    })

    socket.on('error', function (error) {
        logger.info({
            event: 'error',
            message: 'Server emitted error.',
            error,
            ...baseParams,
        })
    })

    const numLinesPerWrite = 10_000
    const makeBuffer = () => {
        let str = ''
        for (let ii = 0; ii <= numLinesPerWrite; ii++) {
            if (linesWritten >= numLines) {
                break
            }
            str += `${linePrefix} ${(++linesWritten).toLocaleString()} ${new Date().toISOString()}\n`
            if (linesWritten % 50_000 === 0) {
                logger.info({
                    event: 'checkpoint',
                    message: `Client sent ${linesWritten.toLocaleString()} of ${numLines.toLocaleString()} lines.`,
                    ...baseParams,
                })
            }
        }
        return str
    }
}

const runMain = async () => {
    const params = {
        numLines: 3_000,
        port: 50111,
        host: 'localhost',
    }
    const logger = makeLogger({
        subsystem: 'canary',
        ...params,
    })
    try {
        await sendData({
            logger,
            ...params,
        })
        logger.info({
            event: 'complete',
            message: 'Finished sending canary data',
        })
    } catch (err) {
        logger.error({
            event: 'error',
            message: `Error sending canary data: ${(err as Error)?.message}`,
        })
    }
}
