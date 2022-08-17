// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import {
    AppendBlobClient,
    BlockBlobClient,
    ContainerClient,
} from '@azure/storage-blob'
import { openSync, readSync } from 'fs'
import { EventLogger } from './utils'

export interface MakeBlobWriterParams {
    containerName: string
    connectionString: string
    logger: EventLogger
}

/**
 *
 * Creates AppendBlobClient, file system, file and returns DataLakeFileClient.
 */
const initContainer = async ({
    containerName,
    connectionString,
}: {
    connectionString: string
    containerName: string
}): Promise<ContainerClient> => {
    let containerClient: ContainerClient
    try {
        containerClient = new ContainerClient(connectionString, containerName)
    } catch (error) {
        const msg = `[init] Failed to create ContainerClient for "${containerName}" from connection string: ${
            (error as Error)?.message
        }`
        throw Error(msg)
    }
    try {
        await containerClient.createIfNotExists()
    } catch (error) {
        const msg = `[init] Failed to create container for "${containerName}": ${
            (error as Error)?.message
        }`
        throw Error(msg)
    }
    return containerClient
}

export interface WriteBlobParams {
    filePath: string
    blobName: string
    hadError?: boolean
}
export interface BlobWriter {
    writeBlob: ({
        filePath,
        blobName,
        hadError,
    }: WriteBlobParams) => Promise<void>
    containerName: string
}

export const makeBlobContainerCleaner = async ({
    containerName,
    connectionString,
}: Pick<MakeBlobWriterParams, 'containerName' | 'connectionString'>) => {
    console.info('Cleaning BLOBs from storage container: ', containerName)
    const containerClient = await initContainer({
        containerName,
        connectionString,
    })

    /**
     *
     * @param params maxBlobSizeInBytesToDelete: If specified, clean will skip/keep BLOBs larger than maxBlobSizeInBytesToDelete. Otherwise, it will delete all BLOBs regardless of size.
     */
    const clean = async (
        params: { maxBlobSizeInBytesToDelete?: number } = {}
    ) => {
        let ii = 0
        for await (const { name } of containerClient.listBlobsFlat()) {
            console.log(
                `${++ii}: Deleting BLOB: "${name}" from "${containerName}".`
            )
            const blobClient = containerClient.getBlobClient(name)
            const props = await blobClient.getProperties()
            if (
                props?.contentLength &&
                params.maxBlobSizeInBytesToDelete &&
                props?.contentLength < params.maxBlobSizeInBytesToDelete
            ) {
                await blobClient.delete({
                    deleteSnapshots: 'include',
                })
            } else {
                console.info(
                    'Skipping deletion of large BLOB:',
                    JSON.stringify({
                        name,
                        size: props?.contentLength?.toLocaleString(),
                    })
                )
            }
        }
    }

    return {
        clean,
    }
}

export const makeBlobWriter = async ({
    containerName,
    connectionString,
    logger,
}: MakeBlobWriterParams): Promise<BlobWriter> => {
    const containerClient = await initContainer({
        containerName,
        connectionString,
    })

    const writeBlob = async ({
        filePath,
        blobName,
        hadError,
    }: WriteBlobParams) => {
        const baseLogParams = {
            containerName,
            blobName,
        }
        let blobClient: BlockBlobClient
        try {
            blobClient = containerClient.getBlockBlobClient(blobName)
        } catch (error) {
            const msg = `[init] Failed to create BlockBlobClient for "${blobName}": ${
                (error as Error)?.message
            }.`
            throw Error(msg)
        }
        logger.info({
            event: 'blob-write',
            message: 'Writing to BLOB using block blob upload....',
            ...baseLogParams,
        })
        try {
            await blobClient.uploadFile(filePath)
            await blobClient.setTags({
                isSuccess: hadError ? 'false' : 'true',
            })
        } catch (err) {
            try {
                await blobClient.setTags({
                    isSuccess: 'false',
                })
            } catch (error) {
                logger.warn({
                    event: 'blob-tag',
                    message: 'Failed to tag BLOB.',
                    ...baseLogParams,
                })
            }
            const errMessage = `[init] Failed to upload "${filePath}" to BLOB "${containerName}/${blobName}": ${
                (err as Error).message
            }`
            throw new Error(errMessage)
        }
    }

    return {
        writeBlob,
        containerName,
    }
}

export const makeAppendBlobWriter = async ({
    containerName,
    connectionString,
}: MakeBlobWriterParams): Promise<BlobWriter> => {
    const containerClient = await initContainer({
        containerName,
        connectionString,
    })

    const writeBlob = async ({
        filePath,
        blobName,
    }: {
        filePath: string
        blobName: string
    }) => {
        let blobClient: AppendBlobClient
        try {
            blobClient = containerClient.getAppendBlobClient(blobName)
        } catch (error) {
            const msg = `[init] Failed to create AppendBlobClient for "${blobName}": ${
                (error as Error)?.message
            }.`
            throw Error(msg)
        }

        await blobClient.create()
        console.log('Writing to BLOB using appendBlob....')
        try {
            const fd = openSync(filePath, 'r')
            const chunkSize = 1 * 1024 * 1024

            let position = 0
            let bytesRead = 0

            let readBuffer = Buffer.alloc(chunkSize)
            do {
                bytesRead = readSync(fd, readBuffer, {
                    position,
                    length: chunkSize,
                })
                await blobClient.appendBlock(readBuffer, bytesRead)
                position += chunkSize
            } while (bytesRead)
            await blobClient.setTags({
                isSuccess: 'true',
            })
            await blobClient.seal()
        } catch (err) {
            try {
                await blobClient.setTags({
                    isSuccess: 'false',
                })
                await blobClient.seal()
            } catch (error) {
                console.warn(
                    `Failed to tag and seal BLOB: "${containerName}/${blobName}"`
                )
            }
            const errMessage = `[init] Failed to upload "${filePath}" to BLOB "${containerName}/${blobName}": ${
                (err as Error).message
            }`
            throw new Error(errMessage)
        }
    }

    return {
        writeBlob,
        containerName,
    }
}
