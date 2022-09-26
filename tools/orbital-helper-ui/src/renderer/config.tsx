// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h } from 'preact'
import {
    AppState,
    getEnvFromState,
    WithAppState,
    WithEffectParams,
    WithIsLoading,
    WithStateUpdater,
} from './appState'
import { Env, ResourceBasics, Spacecraft } from '../preload'
import { Alert, AlertMessage, AlertType } from './alert'
import { makeAPI } from './api'

const { listSpacecrafts } = makeAPI()

export interface ConfigState extends Partial<Env>, WithIsLoading {
    spacecrafts?: Spacecraft[]
}

function uniqueValues<T>(list: T[]) {
    return Array.from(new Set(list.map((_) => JSON.stringify(_)))).map((_) =>
        JSON.parse(_)
    )
}

type WithSpacecrafts = Pick<AppState, 'spacecrafts'>

type ResourceGroupOption = Pick<ResourceBasics, 'name' | 'location'>
const listResourceGroups = ({
    spacecrafts,
}: WithSpacecrafts): ResourceGroupOption[] => {
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

type SubscriptionOption = Pick<ResourceBasics, 'name' | 'subscriptionId'>
const listSubscriptions = ({
    spacecrafts,
}: WithSpacecrafts): SubscriptionOption[] => {
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

export const applyEffect = <T extends ConfigState>({
    useEffect,
    setAppState,
}: WithEffectParams<T>) => {
    useEffect(() => {
        console.info('Applying effect for config.')
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

interface SelectParams<T extends ConfigState, OptionType>
    extends WithStateUpdater<T> {
    title: string
    appState: T
    options: OptionType[]
    optionsLabelKey?: keyof OptionType
    optionsValueKey: keyof OptionType
    stateValueKey: keyof T
}

const Select = <T extends ConfigState, OptionType>({
    appState,
    options,
    setAppState,
    stateValueKey,
    optionsValueKey,
    optionsLabelKey = optionsValueKey,
    title,
}: SelectParams<T, OptionType>) => (
    <div className="container" style={{ width: '100%' }}>
        <label>{title}</label>
        <select
            type="text"
            style={{ width: '100%' }}
            value={String(appState[stateValueKey])}
            readonly={!!appState.isLoading}
            onChange={({ currentTarget }) => {
                setAppState((_prevState) => ({
                    ..._prevState,
                    [stateValueKey]: currentTarget.value?.trim(),
                }))
            }}
        >
            <option disabled={appState.isLoading} value="">
                {appState.isLoading ? 'Loading...' : ' - '}
            </option>
            {(options ?? []).map((_option) => (
                <option
                    label={
                        appState.isLoading
                            ? 'Loading...'
                            : String(_option[optionsLabelKey]) ?? ''
                    }
                    value={String(_option[optionsValueKey]) ?? ''}
                ></option>
            ))}
        </select>
    </div>
)

export const Config = <T extends ConfigState>({
    appState,
    setAppState,
}: WithAppState<T>) => {
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

            <Select
                title="Subscription"
                stateValueKey="subscriptionId"
                options={listSubscriptions(appState) ?? []}
                optionsValueKey="subscriptionId"
                optionsLabelKey="name"
                appState={appState}
                setAppState={setAppState}
            />

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

            <Select
                title="Resource group"
                stateValueKey="resourceGroup"
                options={listResourceGroups(appState) ?? []}
                optionsValueKey="name"
                appState={appState}
                setAppState={setAppState}
            />
        </div>
    )
}
