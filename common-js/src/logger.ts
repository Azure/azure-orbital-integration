// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

export interface BaseLogParams {
    event: string
    error?: { message: string }
    message: string

    [key: string]: any
}

export interface EventLogger<LogParams extends BaseLogParams> {
    info(params: LogParams): void

    warn(params: LogParams): void

    error(params: LogParams): void
    extendContext: (params: { [key: string]: any }) => void
}

export interface WithSubsystem {
    subsystem: string
}

type ConsoleLoggerFx = (message?: any, ...optionalParams: any[]) => void
export interface MakeLoggerParams {
    subsystem: string
    [key: string]: any
}
export const makeLogger = <LogParams extends BaseLogParams>(
    makeLoggerParams: MakeLoggerParams,
    isPretty: boolean = false
): EventLogger<LogParams> => {
    let context = makeLoggerParams
    const doLog = (log: ConsoleLoggerFx, { error, ...params }: LogParams) => {
        log(
            JSON.stringify(
                {
                    ...context,
                    ...params,
                    error: error
                        ? error.message ?? error.toString()
                        : undefined,
                },
                null,
                isPretty ? 2 : ''
            )
        )
    }
    return {
        info: (params: LogParams) => {
            doLog(console.info, params)
        },
        warn: (params: LogParams) => {
            doLog(console.warn, params)
        },
        error: (params: LogParams) => {
            doLog(console.error, params)
        },
        extendContext: (params: { [key: string]: any }) => {
            context = {
                ...context,
                ...params,
            }
        },
    }
}
