// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { getEnv } from './utils'
import { makeBlobContainerCleaner } from './blobWriter'

if (require.main === module) {
    // WARNING: This deletes all BLOBs in the specified storage container.
    const containerName = 'contact-data-aks'
    const { connectionString } = getEnv()
    makeBlobContainerCleaner({
        containerName,
        connectionString,
    })
        .then(async ({ clean }) => {
            await clean({
                maxBlobSizeInBytesToDelete: 100_000_000, // Keep if bigger than 100MB
            })
        })
        .catch((error) => {
            console.error(error)
        })
}
