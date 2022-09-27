// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { getEnvVar } from '@azure/orbital-integration-common'
import { getEnv, makeRemoteToken } from './utils'
import { Server } from 'net'
import { statSync } from 'fs'
import { FileAppender, makeFileAppender } from './fileAppender'
import { BlobWriter, makeBlobWriter, makeContainerClient } from './blobWriter'
import { cidrSubnet } from 'ip'

import { makeLogger } from './utils'

const logger = makeLogger({
    subsystem: 'tcp-to-blob',
})

process.on('uncaughtException', function (error) {
    logger.error({
        event: 'unknown',
        message: 'Unhandled error.',
        error: error as Error,
    })
})

if (require.main === module) {
    const canarySubnetPrefix = getEnvVar('AKS_POD_SUBNET_ADDR_PREFIX')
    const orbitalSubnetPrefix = getEnvVar('AKS_ORBITAL_SUBNET_ADDR_PREFIX')
    const { port, host, socketTimeoutSeconds } = getEnv()
    const server = new Server()
    server.listen(port, host, function () {
        logger.info({
            event: 'server-init',
            message: 'Server listening for connection requests.',
            listenHost: host,
            listenPort: port,
        })

        server.on('connection', async function (socket) {
            const remoteHost = socket.remoteAddress
            const remotePort = socket.remotePort
            const startMillis = Date.now()
            let numBlocks = 0
            let numBytes = 0
            const timestampStr = new Date().toISOString()
            const remoteToken = makeRemoteToken(socket)
            let sender = 'unknown'
            if (
                cidrSubnet(orbitalSubnetPrefix).contains(
                    socket.remoteAddress ?? ''
                )
            ) {
                sender = 'orbital'
            } else if (
                cidrSubnet(canarySubnetPrefix).contains(
                    socket.remoteAddress ?? ''
                )
            ) {
                sender = 'canary'
            }
            const filename = `tcp_data_${timestampStr}_${sender}_${remoteToken}.${sender=='canary'? 'text':'bin'}`
            const logger = makeLogger({
                subsystem: 'tcp-to-blob',
                filename,
                localPort: port,
                remoteHost,
                remotePort,
            })

            const makeMsgData = () =>
                ({
                    durationInSeconds: (Date.now() - startMillis) / 1_000,
                } as any)

            logger.info({
                event: 'socket-connect',
                message: 'Contact connection from remote host',
                ...makeMsgData(),
            })

            socket.setTimeout(1_000 * socketTimeoutSeconds, () => {
                logger.warn({
                    event: 'socket-timeout',
                    message: 'Contact connection timeout',
                    ...makeMsgData(),
                })
                socket.destroy(new Error('Socket timed out.'))
            })

            let fileAppender: FileAppender

            let numActiveBlockProcessors = 0
            const maxBlobSizeInBytesToInspectContent = 1_000
            const httpHeader = 'GET / HTTP/'
            socket.on('data', (data) => {
                if (!data.byteLength) {
                    logger.info({
                        event: 'cleanup',
                        message: 'Skipping file append for 0 length data.',
                        ...makeMsgData(),
                    })
                    return
                } else if (
                    data.byteLength < maxBlobSizeInBytesToInspectContent
                ) {
                    if (
                        data
                            .slice(
                                0,
                                Math.min(httpHeader.length, data.byteLength)
                            )
                            .toString() === httpHeader
                    ) {
                        logger.info({
                            event: 'cleanup',
                            message: 'Skipping file append for HTTP data.',
                            ...makeMsgData(),
                        })
                        return
                    }
                    if (!numBlocks && !data.toString().trim()) {
                        logger.info({
                            event: 'cleanup',
                            message:
                                'Skipping file append for leading empty/white-space data.',
                            ...makeMsgData(),
                        })
                        return
                    }
                } else if (!fileAppender) {
                    try {
                        fileAppender = makeFileAppender({
                            dirPath: '/tmp/output',
                            filename,
                        })
                        const msg = {
                            message: 'Creating file.',
                            event: 'socket-data',
                            filename,
                            ...makeMsgData(),
                        }

                        // Inform caller what BLOB to look for.
                        socket.write(JSON.stringify(msg, null, 2), (error) => {
                            if (error) {
                                logger.error({
                                    event: 'socket-write-notification',
                                    message: 'Error writing to socket.',
                                    ...makeMsgData(),
                                    error: error as Error,
                                })
                            }
                        })
                    } catch (error) {
                        const message = 'Error creating file appender.'
                        logger.error({
                            event: 'socket-data',
                            message,
                            ...makeMsgData(),
                            error: error as Error,
                        })
                        socket.destroy(
                            new Error(`${message} ${(error as Error)?.message}`)
                        )
                        return
                    }
                }
                try {
                    numActiveBlockProcessors++
                    fileAppender.appendFile(data)
                    numBytes += data.byteLength
                    const logFrequency = +(
                        process.env.NUM_BLOCK_LOG_FREQUENCY ?? 100_000
                    )
                    if (0 === ++numBlocks % logFrequency) {
                        logger.info({
                            event: 'socket-data',
                            message: 'Appended block to file.',
                            filePath: fileAppender?.filePath,
                            numBlocks,
                            fileSizeInKB: numBytes / 1_000,
                            ...makeMsgData(),
                        })
                    }
                    numActiveBlockProcessors--
                } catch (error) {
                    const message = 'Error appending block to file.'
                    logger.error({
                        event: 'socket-data',
                        message,
                        filePath: fileAppender?.filePath,
                        numBlocks,
                        ...makeMsgData(),
                        error: error as Error,
                    })
                    socket.destroy(
                        new Error(`${message} ${(error as Error)?.message}`)
                    )
                    numActiveBlockProcessors--
                    return
                }
            })

            socket.on('error', (error) => {
                logger.error({
                    event: 'socket-error',
                    message: error.message,
                    numBlocks,
                    ...makeMsgData(),
                })
            })

            socket.on('close', async (hadError) => {
                logger.extendContext({
                    numBlocks,
                    hadError,
                    receiveDurationInSeconds:
                        (Date.now() - startMillis) / 1_000,
                })
                const event = 'complete'
                let noDataMsg = 'ℹ️ No socket data.'
                if (hadError) {
                    noDataMsg = '⚠️ Socket error.'
                }
                if (!fileAppender?.filePath) {
                    logger.info({
                        event,
                        message: noDataMsg,
                        ...makeMsgData(),
                    })
                    return
                }
                const fileProps = statSync(fileAppender.filePath, {
                    throwIfNoEntry: false,
                })
                if (!fileProps) {
                    logger.info({
                        event,
                        message: noDataMsg,
                        filePath: fileAppender.filePath,
                        ...makeMsgData(),
                    })
                    return
                }
                logger.extendContext({
                    fileSizeInKB: fileProps.size / 1_000,
                })
                logger.info({
                    event: 'socket-close',
                    message: 'Local file write complete. Sending to BLOB.',
                    ...makeMsgData(),
                })
                let blobWriter: BlobWriter
                const blobWriteStartMillis = Date.now()
                try {
                    const { authType, containerClient } = makeContainerClient()
                    logger.extendContext({
                        authType,
                        storageContainer: containerClient.containerName,
                    })
                    blobWriter = await makeBlobWriter({
                        containerClient,
                        logger,
                    })
                } catch (error) {
                    logger.error({
                        event: 'socket-close',
                        message: 'Error creating BLOB writer.',
                        ...makeMsgData(),
                        error: error as Error,
                    })
                    return
                }
                try {
                    logger.info({
                        event: 'socket-close',
                        message: 'Writing to BLOB.',
                        ...makeMsgData(),
                    })
                    await blobWriter.writeBlob({
                        filePath: fileAppender?.filePath,
                        blobName: filename,
                        hadError,
                    })
                    logger.extendContext({
                        blobUploadDurationInSeconds:
                            (Date.now() - blobWriteStartMillis) / 1_000,
                    })
                    try {
                        fileAppender.deleteFile()
                    } catch (error) {
                        logger.warn({
                            event: 'cleanup',
                            message: 'Failed to delete local file.',
                            filePath: fileAppender?.filePath,
                            ...makeMsgData(),
                        })
                    }
                    const errorMessage = '⚠️ BLOB uploaded despite errors.'
                    logger.info({
                        event: 'complete',
                        message: hadError
                            ? errorMessage
                            : '✅ BLOB upload complete.',
                        ...makeMsgData(),
                    })
                } catch (error) {
                    logger.error({
                        event: 'complete',
                        message: '⚠️ BLOB upload failed.',
                        ...makeMsgData(),
                        error: error as Error,
                        blobUploadDurationInSeconds:
                            (Date.now() - blobWriteStartMillis) / 1_000,
                    })
                }
            })
        })
    })
}
