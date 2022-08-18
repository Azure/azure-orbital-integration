// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, basename, extname } from 'path'
import _ from 'lodash'
import { program } from 'commander'

const templateDir = resolve('./')
const defaultTemplateNames = [
    'deploy/tcp-to-blob-template.yaml',
    'deploy/tcp-to-blob-canary-template.yaml',
    'deploy/dashboard-template.json',
]

export interface MakeEnvFilesParams {
    templateNames?: string[]
    outDir?: string
}

const makeEnvFiles = ({ templateNames, outDir }: MakeEnvFilesParams = {}) => {
    const namePrefix = process.env.NAME_PREFIX
    if (!namePrefix) {
        throw new Error('Must set "NAME_PREFIX" env variable')
    }
    outDir = outDir ?? resolve('./dist', 'env', namePrefix)
    templateNames = templateNames ?? defaultTemplateNames
    console.log(
        `Making env files: ${JSON.stringify(
            { outDir, templateNames },
            null,
            2
        )}`
    )

    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
    }
    for (const templateName of templateNames) {
        const infile = resolve(templateDir, templateName)
        const template = readFileSync(infile).toString()
        _.templateSettings.interpolate = /\${([\s\S]+?)}/g
        const render = _.template(template)

        const baseName = basename(templateName)
        const extension = extname(templateName)
        if (!extension) {
            throw new Error('Template file must have "-template" suffix.')
        }
        const suffixIndex = baseName.lastIndexOf('-template')
        if (suffixIndex < 0) {
            throw new Error('Template file must have "-template" suffix.')
        }
        const outFileName = `${baseName.substring(0, suffixIndex)}${extension}`
        const outFile = resolve(outDir, outFileName)
        console.log(` • Creating env file: "${outFile}"`)
        writeFileSync(outFile, render(process.env))
    }
}

if (require.main === module) {
    program
        .option(
            '-t, --templates <string>',
            'e.g. "./a-template.yaml,b-template.json"'
        )
        .option('-o, --output-dir <string>')

    program.parse()

    const options = program.opts()
    const templateNamesString = options.templates?.toString()
    let templateNames: string[] = defaultTemplateNames
    try {
        if (templateNamesString) {
            templateNames = templateNamesString
                .split(/,[\s*]/)
                .map((str: string) => str.trim())
                .filter((str: string) => str.trim().length)
        }
    } catch (error) {
        throw new Error(
            `-t/-templates- argument should be a comma separated list: "${templateNamesString}"`
        )
    }
    if (!templateNames) {
        templateNames = defaultTemplateNames
    }
    makeEnvFiles({
        templateNames,
        outDir: options.outputDir,
    })
}
