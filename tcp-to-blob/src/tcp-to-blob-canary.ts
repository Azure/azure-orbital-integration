// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { sendData, SendDataParams } from './tcpClient'
import { makeLogger } from './utils'

interface ArgvParams {
    host: string
    port: number | string
    numLines: number | string
}
const runJob = async () => {
    const logger = makeLogger({
        subsystem: 'tcp-to-blob-canary',
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
            })
            numLines = defaultNumLines
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
    } catch (err) {
        const message =
            `Failed to create records (params: ${JSON.stringify(
                sendParams
            )}): ` + (err as Error)?.message ?? (err as any)?.toString()
        logger.error({
            event: 'canary-error',
            message,
            error: err as Error,
        })
        throw err
    }
}
if (require.main === module) {
    runJob().catch((err) => {
        throw err
    })
}
