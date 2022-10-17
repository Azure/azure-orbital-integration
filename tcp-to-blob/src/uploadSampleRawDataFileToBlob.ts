import { makeBlobWriter, makeContainerClient } from './blobWriter'
import { makeLogger, getEnvVar } from '@azure/orbital-integration-common'
import { basename } from 'path'

const uploadToBlob = async () => {
    const filePath = getEnvVar('RAW_DATA_FILE_PATH')
    const logger = makeLogger(
        {
            subsystem: 'file-to-blob',
            filePath,
        },
        true
    )

    const { containerClient } = makeContainerClient()
    logger.extendContext({
        storageContainer: containerClient.containerName,
    })

    const { writeBlob } = await makeBlobWriter({
        logger,
        containerClient,
    })
    await writeBlob({
        filePath,
        blobName: `sample-data/${basename(filePath)}`,
    })
    logger.info({
        event: 'complete',
        message: '✅ Finished uploading sample data BLOB.',
    })
}
if (require.main === module) {
    uploadToBlob().catch((err) => console.error(err))
}
