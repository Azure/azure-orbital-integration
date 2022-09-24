// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h } from 'preact'
import {
    AppState,
    getEnvFromState,
    WithAppState,
    WithEffect,
    WithEffectParams,
} from './appState'
import { Env, ResourceBasics, Spacecraft } from '../preload'
import { Alert, AlertMessage, AlertParams, AlertType } from './alert'
import { makeAPI } from './api'

const { listSpacecrafts } = makeAPI()
export interface ConfigState extends Env {
    spacecrafts?: Spacecraft[]
}

function uniqueValues<T>(list: T[]) {
    return Array.from(new Set(list.map((_) => JSON.stringify(_)))).map((_) =>
        JSON.parse(_)
    )
}

type WithSpacecrafts = Pick<AppState, 'spacecrafts'>
const listResourceGroups = ({
    spacecrafts,
}: WithSpacecrafts): Pick<ResourceBasics, 'name' | 'location'>[] => {
    if (!spacecrafts?.length) {
        return []
    }
    return uniqueValues(
        spacecrafts.map((_) => ({
            name: _.resourceGroup,
            location: _.location,
        }))
    )
}

const listSubscriptions = ({
    spacecrafts,
}: WithSpacecrafts): Pick<ResourceBasics, 'name' | 'subscriptionId'>[] => {
    if (!spacecrafts?.length) {
        return []
    }
    return uniqueValues(
        spacecrafts.map((_) => ({
            name: _.subscriptionName,
            subscriptionId: _.subscriptionId,
        }))
    )
}

const listLocations = ({ spacecrafts }: WithSpacecrafts): string[] => {
    if (!spacecrafts?.length) {
        return []
    }
    return [...new Set(spacecrafts.map((_) => _.location))]
}

export const applyEffect: WithEffect = ({
    useEffect,
    setAppState,
}: WithEffectParams) => {
    useEffect(() => {
        console.info('config useEffect')
        setAppState((_prevState) => ({
            ..._prevState,
            isLoading: true,
        }))
        listSpacecrafts().then((spacecrafts) => {
            const locations = listLocations({ spacecrafts })
            const subs = listSubscriptions({ spacecrafts })
            const groups = listResourceGroups({ spacecrafts })
            setAppState((_prevState) => ({
                ..._prevState,
                isLoading: false,
                spacecrafts,
                location: locations.length === 1 ? locations[0] : '',
                subscriptionId: subs.length === 1 ? subs[0].subscriptionId : '',
                resourceGroup: groups.length === 1 ? groups[0].name : '',
                spacecraftName: spacecrafts?.length ? spacecrafts[0].name : '',
            }))
        })
    }, [])
}

export const Config = ({ appState, setAppState }: WithAppState) => {
    const { isEnvComplete } = getEnvFromState(appState)
    let alertType: AlertType = 'info'
    let alertMessage: AlertMessage
    if (appState.isLoading) {
        alertMessage = 'Loading resource graph...'
    } else if (isEnvComplete) {
        alertMessage = 'Items below relate to available Orbital spacecrafts.'
    } else {
        alertType = 'warning'
        alertMessage = (
            <div>
                <strong>Incomplete!</strong> Please complete all items below.
            </div>
        )
    }
    return (
        <div className="container" style={{ width: '30em' }}>
            <Alert type={alertType} message={alertMessage} />

            <div className="container" style={{ width: '100%' }}>
                <label>Subscription</label>
                <select
                    type="text"
                    style={{ width: '100%' }}
                    value={appState.subscriptionId}
                    readOnly={!!appState.isLoading}
                    onChange={({ currentTarget }) => {
                        setAppState((_prevState) => ({
                            ..._prevState,
                            subscriptionId: currentTarget.value?.trim(),
                        }))
                    }}
                >
                    <option disabled={appState.isLoading} value="">
                        {appState.isLoading ? 'Loading...' : ' - '}
                    </option>
                    {(listSubscriptions(appState) ?? []).map(
                        ({ subscriptionId, name }) => (
                            <option
                                label={appState.isLoading ? 'Loading...' : name}
                                value={subscriptionId}
                                selected={
                                    subscriptionId === appState.subscriptionId
                                }
                            ></option>
                        )
                    )}
                </select>
            </div>

            <div className="container">
                <label>Location</label>
                <input
                    readonly={!!appState.isLoading}
                    type="text"
                    style={{ width: 'calc(100% - 2em)' }}
                    value={appState.location ?? ''}
                    onChange={({ currentTarget }) => {
                        setAppState((_prevState) => ({
                            ..._prevState,
                            location: currentTarget.value?.trim(),
                        }))
                    }}
                />
            </div>

            <div className="container" style={{ width: '100%' }}>
                <label>Resource group</label>
                <select
                    type="text"
                    style={{ width: '100%' }}
                    value={appState.resourceGroup}
                    readonly={!!appState.isLoading}
                    onChange={({ currentTarget }) => {
                        setAppState((_prevState) => ({
                            ..._prevState,
                            resourceGroup: currentTarget.value?.trim(),
                        }))
                    }}
                >
                    <option disabled={appState.isLoading} value="">
                        {appState.isLoading ? 'Loading...' : ' - '}
                    </option>
                    {(listResourceGroups(appState) ?? []).map(({ name }) => (
                        <option
                            label={appState.isLoading ? 'Loading...' : name}
                            value={name}
                            selected={name === appState.resourceGroup}
                        ></option>
                    ))}
                </select>
            </div>
        </div>
    )
}
