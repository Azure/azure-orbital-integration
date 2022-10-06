// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h } from 'preact'
import {
    WithAppState,
    WithIsLoading,
} from './appState'
import { Env } from '../preload'
import { Alert, AlertParams } from './alert'
import { GetCountsByTypeResponse } from '@azure/orbital-integration-common'

export interface HealthState
    extends Partial<Env>,
        WithIsLoading,
        Partial<GetCountsByTypeResponse> {
    resourceNamePrefix?: string
    isNamePrefixContentLoading?: boolean
    healthErrorMessage?: string
}

type AlertInfoParams = HealthState &
    Pick<GetCountsByTypeResponse, 'isHealthy' | 'message'>

const getAlertParams = (params: AlertInfoParams): AlertParams => {
    if (params.isNamePrefixContentLoading) {
        return {
            type: 'info',
            message: 'Performing health check...',
        }
    }
    if (!params.resourceNamePrefix) {
        return {
            type: 'info',
            message:
                'Provide resource name prefix for TCP to BLOB health check.',
        }
    }
    if (params.isHealthy) {
        return {
            type: 'success',
            message: 'Looking good.',
        }
    }
    return {
        type: params.message?.startsWith('Multiple resources found')
            ? 'warning'
            : 'danger',
        message: params.message ?? 'Unknown error',
    }
}

export const NamePrefixInput = <T extends HealthState>({
    appState,
    setAppState,
}: WithAppState<T>) => {
    return (
        <div className="container" style={{ width: '30em' }}>
            <label>Resource name prefix</label>
            <input
                readOnly={
                    !!appState.isLoading || appState.isNamePrefixContentLoading
                }
                type="text"
                style={{ width: 'calc(100% - 2em)' }}
                value={appState.resourceNamePrefix ?? ''}
                onChange={({ currentTarget }) => {
                    setAppState((_prevState) => ({
                        ..._prevState,
                        resourceNamePrefix: currentTarget.value?.trim() ?? '',
                    }))
                }}
            />
        </div>
    )
}

export const Health = <T extends HealthState>({
    appState,
    setAppState,
}: WithAppState<T>) => {
    const alertParams = getAlertParams({
        ...appState,
        message: appState.message,
        isHealthy: appState.isHealthy ?? true,
    })
    return (
        <div className="container" style={{ color: '#444', width: '30em' }}>
            <Alert type={alertParams.type} message={alertParams.message} />
            <NamePrefixInput {...{ appState, setAppState }} />
            {!appState.typeMetrics ||
            appState.isNamePrefixContentLoading ||
            !appState.resourceNamePrefix ? null : (
                <div>
                    {Object.entries(appState.typeMetrics).map(
                        ([type, { count, names, title }]) => (
                            <div style={{ padding: '7px' }}>
                                <span style={{ paddingRight: '6px' }}>
                                    {count === 1
                                        ? '✅'
                                        : count < 1
                                        ? '❌'
                                        : '❓'}
                                </span>
                                {title}
                                {!names?.length ? null : names.length > 1 ? (
                                    <span style={{ color: '#8B0000' }}>
                                        : Multiple matches!
                                    </span>
                                ) : (
                                    <span style={{ color: '#787878' }}>
                                        : {names[0]}
                                    </span>
                                )}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    )
}
