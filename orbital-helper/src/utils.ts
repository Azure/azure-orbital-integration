// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

const roundToHundredths = (num: number) => Math.round(100 * num) / 100

export const getEnvVar = (name) => {
    const val = process.env[name]
    if (!val) {
        throw new Error(`Must set "${name}" env variable.`)
    }
    return val
}
export const getOptionalEnvVar = (name) => {
    const val = process.env[name]?.trim()
    if (!val) {
        return undefined
    }
    return val
}

export const getOptionalNumericEnvVar = (name) => {
    const val = process.env[name]
    if (!val) {
        return undefined
    }
    const numericVal = +val
    return isNaN(numericVal) ? undefined : numericVal
}

export const prettyDuration = ({
    startMillis,
    endMillis = Date.now(),
}: {
    startMillis: number
    endMillis?: number
}) => {
    const durationMillis = endMillis - startMillis
    const millisInMinute = 60_000
    const millisInHour = 60 * millisInMinute
    const millisInDay = 24 * millisInHour
    const daysPart =
        durationMillis >= millisInDay
            ? `${Math.floor(
                  durationMillis / millisInDay
              ).toLocaleString()} days `
            : ''
    const hoursPart =
        durationMillis >= millisInHour
            ? `${Math.floor(durationMillis / millisInHour) % 24} hrs `
            : ''
    const minutesPart =
        durationMillis >= millisInMinute
            ? `${Math.floor(durationMillis / millisInMinute) % 60} min `
            : ''
    const secondsPart = `${roundToHundredths(
        (durationMillis / 1_000) % 60
    )} sec`

    return `${daysPart}${hoursPart}${minutesPart}${secondsPart}`
}

if (require.main === module) {
    console.log(roundToHundredths(124234.3544545))
}
