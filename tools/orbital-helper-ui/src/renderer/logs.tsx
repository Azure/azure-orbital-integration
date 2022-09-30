// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h } from 'preact'
import {
    WithAppState,
    WithIsLoading,
} from './appState'
import { Env, EventLogEntry } from '../preload'
import { GetCountsByTypeResponse } from '@azure/orbital-integration-common'
import { NamePrefixInput } from './health'
import { Alert, AlertParams } from './alert'
import { filter } from './contacts'

export interface LogsState
    extends Partial<Env>,
        WithIsLoading,
        Partial<GetCountsByTypeResponse> {
    resourceNamePrefix?: string
    isNamePrefixContentLoading?: boolean
    logs?: EventLogEntry[]
    logSearchErrorMassage?: string
    subsystemFilter?: string
    eventFilter?: string
    messageFilter?: string
}

export const filterProperties = [
    // key matches state key
    'subsystem',
    'event',
    'message',
    'filename',
]

type AlertInfoParams = LogsState & Pick<GetCountsByTypeResponse, 'message'>

const getAlertParams = (params: AlertInfoParams): AlertParams | undefined => {
    if (params.isNamePrefixContentLoading || params.isLoading) {
        return {
            type: 'info',
            message: 'Searching logs...',
        }
    }
    if (!params.resourceNamePrefix) {
        return {
            type: 'info',
            message: 'Provide resource name prefix to search logs.',
        }
    }
    if (params.logSearchErrorMassage) {
        const missingLawToken = 'Error: No log analytics workspace found'
        const missingLawTokenIndex =
            params.logSearchErrorMassage.indexOf(missingLawToken)
        return {
            type: 'danger',
            message:
                missingLawTokenIndex > 0
                    ? params.logSearchErrorMassage.substring(
                          missingLawTokenIndex + 'Error: '.length
                      )
                    : params.logSearchErrorMassage,
        }
    }
    return undefined
}

const filterLogs = (
    appState: Pick<
        LogsState,
        'logs' | 'subsystemFilter' | 'eventFilter' | 'messageFilter'
    > &
        Partial<Env>
) => {
    let res = appState.logs ?? [] // filter name
    const _state = appState as unknown as any
    for (const propName of filterProperties) {
        res = res.filter((_logEntry) => {
            return filter({
                filterValue: _state[`${propName}Filter`],
                propertyValue: (_logEntry as unknown as any)[propName],
            })
        })
    }
    return res
}

export const Logs = <T extends LogsState>({
    setAppState,
    appState,
}: WithAppState<T>) => {
    const alertParams = getAlertParams({
        ...appState,
        message: appState.message,
        isHealthy: appState.isHealthy ?? true,
    })
    const _logs = filterLogs(appState)
    return (
        <div className="content" style={{ color: '#444', width: '100%' }}>
            {alertParams && (
                <Alert type={alertParams.type} message={alertParams.message} />
            )}
            <NamePrefixInput {...{ appState, setAppState }} />

            <table className="filterable">
                <thead>
                    <th>Start</th>
                    {filterProperties.map((key) => {
                        const stateFilterPropName = `${key}Filter`
                        return (
                            <th>
                                <span style={{ textTransform: 'capitalize' }}>
                                    {key}
                                </span>
                                {appState.resourceNamePrefix && (
                                    <div className="container">
                                        <input
                                            disabled={
                                                appState.isLoading ||
                                                appState.isNamePrefixContentLoading
                                            }
                                            type={'text'}
                                            value={
                                                (appState as unknown as any)[
                                                    stateFilterPropName
                                                ]
                                            }
                                            onChange={(e) => {
                                                const val =
                                                    e.currentTarget.value?.trim()
                                                setAppState((_prevState) => ({
                                                    ..._prevState,
                                                    [stateFilterPropName]:
                                                        val?.trim()
                                                            ? val
                                                            : undefined,
                                                }))
                                            }}
                                        />
                                    </div>
                                )}
                            </th>
                        )
                    })}
                </thead>
                <tbody>
                    {!_logs?.length ? (
                        <tr>
                            <td style={{ color: '#909090' }}>
                                {appState.isLoading
                                    ? 'Loading resource graph...'
                                    : appState.isNamePrefixContentLoading
                                    ? 'Searching logs...'
                                    : !appState.resourceNamePrefix
                                    ? 'Please provide a name prefix above.'
                                    : 'No matching logs.'}
                            </td>
                        </tr>
                    ) : (
                        _logs.map((entry) => (
                            <tr>
                                <td>{entry.timestamp.toLocaleString()}</td>
                                <td>{entry.subsystem}</td>
                                <td>{entry.event}</td>
                                <td
                                    style={{
                                        maxWidth: '18em',
                                        overflowWrap: 'break-word',
                                        overflowX: 'auto',
                                        overflowY: 'auto',
                                        overflow: 'wrap',
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {entry.message}
                                </td>
                                <td>{(entry as unknown as any).filename}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
