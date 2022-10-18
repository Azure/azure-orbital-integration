// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

const roundToHundredths = (num: number) => Math.round(100 * num) / 100

export const getEnvVar = (name: string) => {
    const val = process.env[name]
    if (!val) {
        throw new Error(`Must set "${name}" env variable.`)
    }
    return val
}
export const getOptionalEnvVar = (name: string) => {
    const val = process.env[name]?.trim()
    if (!val) {
        return undefined
    }
    return val
}

export const getOptionalNumericEnvVar = (name: string) => {
    const val = process.env[name]
    if (!val) {
        return undefined
    }
    const numericVal = +val
    return isNaN(numericVal) ? undefined : numericVal
}

const millisInMinute = 60_000
const millisInHour = 60 * millisInMinute
const millisInDay = 24 * millisInHour

export const prettyDuration = ({
    startMillis,
    endMillis = Date.now(),
}: {
    startMillis: number
    endMillis?: number
}) => {
    const durationMillis = endMillis - startMillis
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

    return `${daysPart}${hoursPart}${minutesPart}`
}

export const getNumDays = (date: Date) => {
    const millis = Math.abs(Date.now() - date.getTime())
    return Math.floor(millis / millisInDay)
}

export const getNumHours = (date: Date) => {
    const millis = Math.abs(Date.now() - date.getTime())
    return Math.floor(millis / millisInHour)
}

const defaultSleepMillis = 1_000 // 1 second

export const sleep = async (sleepMillis = defaultSleepMillis) => {
    return new Promise((resolve) => {
        setTimeout(resolve, sleepMillis)
    })
}
