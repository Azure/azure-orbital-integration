// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { sendData, SendDataParams } from './tcpClient'
import { makeLogger } from './utils'
import { v4 as uuid } from 'uuid'

interface ArgvParams {
    host: string
    port: number | string
    numLines: number | string
}

const runJob = async () => {
    const startMillis = Date.now()

    const makeDuration = () => ({
        durationInSeconds: (Date.now() - startMillis) / 1_000,
    })
    const logger = makeLogger({
        subsystem: 'tcp-to-blob-text-canary',
        resolutionId: uuid(),
    })
    let sendParams: SendDataParams | null = null
    try {
        if (process.argv.length < 3) {
            throw new Error('Must specify params JSON as 1st arg.')
        }
        let argvData: ArgvParams
        if (process.argv.length < 3) {
            const message = 'Must specify JSON as 1st command line argument.'
            logger.error({
                event: 'init',
                message,
                ...makeDuration(),
            })
            throw new Error(message)
        }
        try {
            argvData = JSON.parse(process.argv[2])
        } catch (error) {
            const message = `Unable to parse JSON from argv[0]: ${
                (error as Error)?.message ?? error
            }`
            logger.error({
                event: 'init',
                message,
                ...makeDuration(),
            })
            throw new Error(message)
        }

        const defaultNumLines = 40_000
        const host = argvData.host
        let port = +argvData.port
        let numLines = +argvData.numLines
        if (isNaN(+numLines)) {
            logger.info({
                event: 'init',
                message: `Unable to read "numLines" from input. Using default: ${defaultNumLines}.`,
                ...makeDuration(),
            })
            numLines = defaultNumLines
            logger.extendContext({
                host,
                port,
                numLines,
            })
        }
        if (isNaN(port)) {
            throw new Error(
                'Must specify params JSON as 1st arg including "port" number.'
            )
        }

        sendParams = {
            logger,
            host,
            port,
            numLines,
        }
        await sendData(sendParams)
        logger.info({
            event: 'complete',
            message: '✅ Finished sending text data to TCP socket.',
            ...makeDuration(),
        })
    } catch (err) {
        const message = `⚠️ Failed to send text data to TCP socket. ${
            (err as Error)?.message
        }`.trim()
        logger.error({
            event: 'complete',
            message,
            error: err as Error,
            ...makeDuration(),
        })
        throw err
    }
}
if (require.main === module) {
    runJob().catch((err) => {
        throw err
    })
}
