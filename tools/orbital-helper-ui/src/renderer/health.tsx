// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h } from 'preact'
import {
    WithAppState,
    WithEffect,
    WithEffectParams,
    WithIsLoading,
} from './appState'
import { makeAPI } from './api'
import { Env } from '../preload'
import { Alert, AlertParams } from './alert'
import { GetCountsByTypeResponse } from '@azure/orbital-integration-common'

const { checkRequiredResources } = makeAPI()

export interface HealthState
    extends Partial<Env>,
        WithIsLoading,
        Partial<GetCountsByTypeResponse> {
    resourceNamePrefix?: string
    isHealthLoading?: boolean
}

export const applyEffect: WithEffect<HealthState> = <T extends HealthState>({
    appState,
    useEffect,
    setAppState,
}: WithEffectParams<T>) => {
    useEffect(() => {
        if (
            !appState.resourceNamePrefix ||
            !appState.subscriptionId ||
            !appState.resourceGroup ||
            !appState.location
        ) {
            setAppState((_prevState) => ({
                ..._prevState,
                isHealthy: undefined,
                message: undefined,
                typeMetrics: undefined,
            }))
            return
        }
        setAppState((_prevState) => ({
            ..._prevState,
            isHealthLoading: true,
        }))
        checkRequiredResources({
            resourceNamePrefix: appState.resourceNamePrefix,
            subscriptionId: appState.subscriptionId,
            resourceGroup: appState.resourceGroup,
            location: appState.location,
        }).then((res) => {
            setAppState((_prevState) => ({
                ..._prevState,
                ...res,
                isHealthLoading: false,
            }))
        })
    }, [
        appState.resourceNamePrefix,
        appState.subscriptionId,
        appState.resourceGroup,
        appState.location,
    ])
}

type AlertInfoParams = HealthState &
    Pick<GetCountsByTypeResponse, 'isHealthy' | 'message'>

const getAlertParams = (params: AlertInfoParams): AlertParams => {
    if (params.isHealthLoading) {
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
            <div className="container">
                <label>Resource name prefix</label>
                <input
                    readOnly={!!appState.isLoading || appState.isHealthLoading}
                    type="text"
                    style={{ width: 'calc(100% - 2em)' }}
                    value={appState.resourceNamePrefix ?? ''}
                    onChange={({ currentTarget }) => {
                        setAppState((_prevState) => ({
                            ..._prevState,
                            resourceNamePrefix:
                                currentTarget.value?.trim() ?? '',
                        }))
                    }}
                />
            </div>
            {!appState.typeMetrics ||
            appState.isHealthLoading ||
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
