// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { makeContainerClient } from './blobWriter'
import { makeSocket } from './tcpClient'
import { makeLogger } from './utils'
import { getEnvVar } from '@azure/orbital-integration-common'
import { v4 as uuid } from 'uuid'

const runJob = async () => {
    const startMillis = Date.now()
    const makeDuration = () => ({
        durationInSeconds: (Date.now() - startMillis) / 1_000,
    })
    const storageContainer = getEnvVar('CONTACT_DATA_STORAGE_CONTAINER')
    const blobName = getEnvVar('RAW_DATA_BLOB_NAME')
    const host = getEnvVar('LB_IP')
    const port = +getEnvVar('PORT')
    const logger = makeLogger({
        subsystem: 'tcp-to-blob-raw-canary',
        containerName: storageContainer,
        filename: blobName,
        host,
        port,
        resolutionId: uuid(),
    })

    try {
        if (isNaN(port)) {
            throw new Error(
                'Must specify params JSON as 1st arg including "port" number.'
            )
        }

        const { containerClient } = makeContainerClient()

        const blobClient = await containerClient.getBlobClient(blobName)
        if (!(await blobClient.exists())) {
            logger.error({
                event: 'complete',
                message: '⚠️ BLOB not found.',
                ...makeDuration(),
            })
            return
        }
        const socket = makeSocket({ host, port, logger })

        logger.info({
            event: 'client-create',
            message: 'BLOB Client created successfully.',
            ...makeDuration(),
        })
        const downloadResponse = await blobClient.download(0)

        logger.info({
            event: 'read-stream-create',
            message: 'BLOB Client readable stream created.',
            ...makeDuration(),
        })
        await new Promise<void>((resolve, reject) => {
            downloadResponse.readableStreamBody
                ?.pipe(socket)
                .on('finish', () => {
                    logger.info({
                        event: 'complete',
                        message: '✅ BLOB written successfully to TCP socket.',
                        ...makeDuration(),
                    })
                    resolve()
                })
                .on('error', (err) => {
                    reject(err)
                })
        })
    } catch (err) {
        const message = `⚠️ Failed to stream BLOB to TCP socket. ${
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
    runJob().then(() => {
        // We've already handled the error as needed. Nothing else to do.
    })
}
