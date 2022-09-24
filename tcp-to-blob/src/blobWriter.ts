// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { BlockBlobClient, ContainerClient } from '@azure/storage-blob'
import { getEnv, LogParams } from './utils'
import { EventLogger } from '@azure/arm-orbital-helper'

export interface WithContainerClient {
    containerClient: ContainerClient
}

export interface MakeBlobWriterParams extends WithContainerClient {
    logger: EventLogger<LogParams>
}

export type AuthType = 'Connection String' | 'DefaultAzureCredential'

const defaultSecretValue = '-'
export const makeContainerClient = (): {
    authType: AuthType
    containerClient: ContainerClient
} => {
    let authType: AuthType
    let connectionString =
        process.env.CONTACT_DATA_STORAGE_CONNECTION_STRING?.trim()
    const { storageContainer } = getEnv()
    if (connectionString && connectionString !== defaultSecretValue) {
        authType = 'Connection String'
        return {
            authType,
            containerClient: new ContainerClient(
                connectionString,
                storageContainer
            ),
        }
    } else {
        throw new Error(
            'Must set "CONTACT_DATA_STORAGE_CONNECTION_STRING" to enable BLOB write permissions'
        )
    }
}

/**
 *
 * Creates AppendBlobClient, file system, file and returns DataLakeFileClient.
 */
const initContainer = async ({
    containerClient,
}: WithContainerClient): Promise<void> => {
    try {
        await containerClient.createIfNotExists()
    } catch (error) {
        const msg = `[init] Failed to create container for "${
            containerClient.containerName
        }": ${(error as Error)?.message}`
        throw Error(msg)
    }
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
    containerClient,
}: WithContainerClient) => {
    console.info(
        'Making BLOB clean for storage container: ',
        containerClient.containerName
    )

    /**
     *
     * @param params maxBlobSizeInBytesToDelete: If specified, clean will skip/keep BLOBs larger than maxBlobSizeInBytesToDelete. Otherwise, it will delete all BLOBs regardless of size.
     */
    const clean = async (
        params: { maxBlobSizeInBytesToDelete?: number } = {}
    ) => {
        if (!(await containerClient.exists())) {
            console.log(
                `Container "${containerClient.containerName}" does not exist. Nothing to clean.`
            )
            return
        }
        let ii = 0
        for await (const { name } of containerClient.listBlobsFlat()) {
            console.log(
                `${++ii}: Deleting BLOB: "${name}" from "${
                    containerClient.containerName
                }".`
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
    containerClient,
    logger,
}: MakeBlobWriterParams): Promise<BlobWriter> => {
    await initContainer({ containerClient })
    const containerName = containerClient.containerName

    const writeBlob = async ({
        filePath,
        blobName,
        hadError,
    }: WriteBlobParams) => {
        const baseLogParams = {
            containerName,
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
            const errMessage = `[init] Failed to upload "${filePath}" to BLOB "${
                containerClient.containerName
            }/${blobName}": ${(err as Error).message}`
            throw new Error(errMessage)
        }
    }

    return {
        writeBlob,
        containerName,
    }
}
