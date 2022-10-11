// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import * as fs from 'fs'
import { logger } from '@azure/storage-blob'
import { makeContainerClient } from './blobWriter'
import { makeSocket } from './tcpClient'
import { makeLogger } from './utils'
import { getEnvVar } from '@azure/orbital-integration-common'

const runJob = async () => {
    const blobName = getEnvVar('RAW_DATA_BLOB_NAME')
    const host = getEnvVar('LB_IP')
    const port = +getEnvVar('PORT')
    const logger = makeLogger({
        subsystem: 'tcp-to-blob-raw-canary',
    })

    try {
        if (isNaN(port)) {
            throw new Error(
                'Must specify params JSON as 1st arg including "port" number.'
            )
        }

        const socket = makeSocket({ host, port, logger })
        const containerClient = makeContainerClient().containerClient
        const blobClient = await containerClient.getBlobClient(blobName)

        console.log('properties below')
        console.log(await blobClient.getProperties())

        const downloadResponse = await blobClient.download(0)

        downloadResponse.readableStreamBody?.pipe(socket)
        console.log(`download of ${blobName} succeeded`)
    } catch (err) {
        const message =
            `Failed to create records (params: ${JSON.stringify({
                blobName,
                host,
                port,
            })}): ` + (err as Error)?.message ?? (err as any)?.toString()
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
        logger.error({
            event: 'canary-error',
            message: err.message,
            error: err as Error,
        })
        throw err
    })
}

const downloadBlobAsStream = async (
    blobName: string,
    writableStream: fs.WriteStream
) => {
    const containerClient = makeContainerClient().containerClient
    const blobClient = await containerClient.getBlobClient(blobName)

    console.log('properties below')
    console.log(await blobClient.getProperties())

    const downloadResponse = await blobClient.download(0)

    downloadResponse.readableStreamBody?.pipe(writableStream)
    console.log(`download of ${blobName} succeeded`)
}