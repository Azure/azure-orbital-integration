// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

const esbuild = require('esbuild')

function showUsage() {
    console.log('USAGE')
    console.log('node esbuild.js dev')
    console.log('node esbuild.js prod')
    process.exit(0)
}

if (process.argv.length < 3) {
    showUsage()
}

if (!['dev', 'prod'].includes(process.argv[2])) {
    showUsage()
}

// production mode, or not
const production = process.argv[2] === 'prod'

// esbuild watch in dev mode to rebuild out files
let watch = false
if (!production) {
    watch = {
        onRebuild(error) {
            if (error)
                console.error(
                    'esbuild: Watch build failed:',
                    error.getMessage()
                )
            else console.log('esbuild: Watch build succeeded')
        },
    }
}

// esbuild build options
// see: https://esbuild.github.io/api/#build-api
const options = {
    entryPoints: ['./src/index.ts'],
    bundle: true,
    watch,
    external: ['electron'],
    format: 'esm',
    minify: production,
    sourcemap: false,
    outfile: './electron/public/bundle.js', // and bundle.css
}

// esbuild dev + prod
esbuild.build(options).catch((err) => {
    console.error(err)
    process.exit(1)
})
