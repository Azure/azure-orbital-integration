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
import { Env, SearchResourcesResponse } from '../preload'
import { Alert, AlertParams } from './alert'

const { searchResources } = makeAPI()

export interface HealthState extends Partial<Env>, WithIsLoading {
    resources?: SearchResourcesResponse[]
    resourceNamePrefix?: string
    isHealthLoading?: boolean
}

export const applyEffect: WithEffect<HealthState> = <T extends HealthState>({
    appState,
    useEffect,
    setAppState,
}: WithEffectParams<T>) => {
    useEffect(() => {
        if (!appState.resourceNamePrefix) {
            if (appState.resources?.length) {
                setAppState((_prevState) => ({
                    ..._prevState,
                    resources: [],
                }))
            }
            return
        }
        setAppState((_prevState) => ({
            ..._prevState,
            isHealthLoading: true,
        }))
        searchResources({
            resourceNamePrefix: appState.resourceNamePrefix,
            subscriptionId: appState.subscriptionId,
            resourceGroup: appState.resourceGroup,
            location: appState.location,
        }).then((resources) => {
            setAppState((_prevState) => ({
                ..._prevState,
                resources,
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

const requiredResourceTitleMap: { [key: string]: string } = {
    'microsoft.network/virtualnetworks': 'VNet',
    'microsoft.containerservice/managedclusters': 'AKS Cluster',
    'microsoft.managedidentity/userassignedidentities': 'AKS Identity',
    'microsoft.orbital/contactprofiles': 'Orbital Contact Profile',
    'microsoft.portal/dashboards': 'ADO Dashboard',
    'microsoft.operationalinsights/workspaces': 'Log Analytics Workspace',
}

interface TypeMetric {
    count: number
    names?: string[]
}
type GetCountsByTypeResponse = {
    isHealthy: boolean
    typeMetrics: {
        [type: string]: TypeMetric
    }
    message?: string
}
const getCountsByType = ({
    resources,
}: Pick<HealthState, 'resources'>): GetCountsByTypeResponse => {
    const res: GetCountsByTypeResponse = {
        isHealthy: true,
        typeMetrics: {},
    }
    for (const [type] of Object.entries(requiredResourceTitleMap)) {
        const typeMetric: TypeMetric = {
            count: 0,
            names: [],
        }

        for (const _resource of resources ?? []) {
            if (_resource.type === type) {
                typeMetric.count = typeMetric.count + 1
                typeMetric.names?.push(_resource.name)
                if (typeMetric.count > 1) {
                    res.isHealthy = false
                    res.message = `Multiple resources found of same type. Use more specific prefix.`
                }
            }
        }

        if (typeMetric.count < 1) {
            res.isHealthy = false
            res.message = `Missing one or more required resources.`
        }

        res.typeMetrics[type] = typeMetric
    }

    return res
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
    const { isHealthy, message, typeMetrics } = getCountsByType({
        resources: appState.resources,
    })
    const alertParams = getAlertParams({
        ...appState,
        message,
        isHealthy,
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
            {appState.isHealthLoading || !appState.resourceNamePrefix ? null : (
                <div>
                    {Object.entries(typeMetrics).map(
                        ([type, { count, names }]) => (
                            <div style={{ padding: '7px' }}>
                                <span style={{ paddingRight: '6px' }}>
                                    {count === 1
                                        ? '✅'
                                        : count < 1
                                        ? '❌'
                                        : '❓'}
                                </span>
                                {requiredResourceTitleMap[type] ?? 'Unknown'}
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
