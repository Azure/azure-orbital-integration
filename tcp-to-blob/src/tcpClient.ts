// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { Socket } from 'net'
import {EventLogger, makeLogger, sleep} from './utils'

export interface SendDataParams {
    numLines: number
    host: string
    port: number
    logger: EventLogger
}

export const sendData = async ({
    numLines,
    host,
    port,
    logger,
}: SendDataParams) => {
    const client = new Socket({
        allowHalfOpen: true,
    })

    let linesWritten = 0
    const baseParams = {
        host,
        port,
        linesWritten,
        numLines,
    }

    logger.info({
        event: 'init',
        message: 'Establishing connection.',
        ...baseParams,
    })

    let isOkToWrite = true

    client.setTimeout(30_000)
    const socket = client.connect(port, host)

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
            message: '✅ Finished sending.',
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
            str += `Hello from Client ${(++linesWritten).toLocaleString()} ${new Date().toISOString()}\n`
            if (linesWritten % 10_000 === 0) {
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

if(require.main === module) {
    sendData({
        numLines: 3_000,
        logger: makeLogger({ subsystem: 'localhost'}),
        port: 50111,
        host: 'localhost'
    }).then(()=> {
        console.log('done')
    }).catch(err => {
        console.error(err)
    })
}