// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { appendFileSync, mkdirSync, rmSync } from 'fs'
import { resolve } from 'path'

export interface FileAppender {
    appendFile: (data: string | Uint8Array) => void
    deleteFile: () => void
    filePath: string
}

export const makeFileAppender = (params: {
    dirPath: string
    filename: string
}): FileAppender => {
    const dirPath = resolve(params.dirPath)
    const filePath = resolve(params.dirPath, params.filename)
    mkdirSync(dirPath, { recursive: true })

    const appendFile = (data: string | Uint8Array): void => {
        appendFileSync(filePath, data)
    }

    const deleteFile = () => {
        rmSync(filePath, { force: true })
    }

    return {
        filePath,
        appendFile,
        deleteFile,
    }
}
