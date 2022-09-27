// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h } from 'preact'
import { Env, Spacecraft, SearchContactsParams } from '../preload'
import { ContactSummary } from '@azure/arm-orbital-helper'
import {
    AppState,
    getEnvFromState,
    WithAppState,
    WithEffect,
    WithEffectParams,
    WithIsLoading,
    WithStateUpdater,
} from './appState'
import { makeAPI } from './api'

const { searchContacts } = makeAPI()

const getStatusColor = (status: string | null | undefined) => {
    if (status === 'succeeded') {
        return 'green'
    } else if (status === 'failed') {
        return '#880808'
    }
    return ''
}

export interface FilterConfigItem {
    title: string
    contactSummaryKey: keyof ContactSummary
}

export const statusPrefix: FilterConfigItem = {
    title: 'Status',
    contactSummaryKey: 'status',
}
export const namePrefix: FilterConfigItem = {
    title: 'Contact name',
    contactSummaryKey: 'contactName',
}
export const contactProfilePrefix: FilterConfigItem = {
    title: 'Contact profile',
    contactSummaryKey: 'contactProfileName',
}
export const groundStationPrefix: FilterConfigItem = {
    title: 'Ground station',
    contactSummaryKey: 'groundStationName',
}

export const filterConfig = {
    // key matches state key
    statusPrefix,
    namePrefix,
    contactProfilePrefix,
    groundStationPrefix,
}

export type FilterKey = keyof typeof filterConfig

export interface ContactSearchState extends Partial<Env>, WithIsLoading {
    spacecraftName?: string
    contacts?: ContactSummary[]
    spacecrafts?: Spacecraft[]
    statusPrefix?: string
    namePrefix?: string
    contactProfilePrefix?: string
    groundStationPrefix?: string
    isContactsLoading?: boolean
}

type SpacecraftSelectParams<T extends ContactSearchState> =
    Partial<SearchContactsParams> &
        Pick<AppState, 'isLoading' | 'isContactsLoading' | 'spacecrafts'> &
        WithStateUpdater<T>

const filterSpacecrafts = (
    appState: Pick<AppState, 'spacecrafts'> & Partial<Env>
) => {
    return (appState.spacecrafts ?? [])
        .filter((_) =>
            !appState.subscriptionId
                ? true
                : appState.subscriptionId === _.subscriptionId
        )
        .filter((_) =>
            !appState.resourceGroup
                ? true
                : appState.resourceGroup === _.resourceGroup
        )
        .filter((_) =>
            !appState.location ? true : appState.location === _.location
        )
}

const SpacecraftSelect = <T extends ContactSearchState>({
    setAppState,
    isLoading,
    isContactsLoading,
    spacecraftName,
    spacecrafts,
}: SpacecraftSelectParams<T>) => {
    return (
        <select
            disabled={isLoading || isContactsLoading}
            onChange={({ currentTarget }) => {
                console.log('spacecraft change. updating...')
                setAppState((_prevState) => ({
                    ..._prevState,
                    spacecraftName: currentTarget.value?.trim(),
                }))
            }}
        >
            <option disabled={isLoading} value="">
                {isLoading ? 'Loading...' : ' - '}
            </option>
            {(spacecrafts ?? []).map(({ name }) => (
                <option
                    selected={(spacecraftName ?? '') === name}
                    value={name}
                    label={isLoading ? 'Loading...' : name}
                />
            ))}
        </select>
    )
}

const getEmptyContactsMessage = (appState: Partial<ContactSearchState>) => {
    if (appState.isContactsLoading) {
        return 'Loading...'
    }
    if (!appState.spacecrafts?.length) {
        return `No spacecrafts found in "${appState.location}" for "${appState.resourceGroup}" resource group.`
    }
    if (!appState.spacecraftName) {
        return 'Please select a spacecraft above.'
    }
    if (!appState.contacts?.length) {
        return 'No matching contacts.'
    }
    return null
}

const filterContacts = (state: Partial<ContactSearchState>) => {
    let filteredContacts = state.contacts ?? []
    for (const [filterKey, { contactSummaryKey }] of Object.entries(
        filterConfig
    )) {
        filteredContacts = filteredContacts?.filter((contactSummary) => {
            const filterValue = state[filterKey as unknown as FilterKey]
            if (!filterValue?.trim()) {
                // No value set for filter property => keep it.
                return true
            }
            // Keep it if prefix matches
            return contactSummary[contactSummaryKey]
                ?.toLowerCase()
                .startsWith(filterValue?.toLowerCase())
        })
    }
    return filteredContacts
}

export const applyEffect: WithEffect<ContactSearchState> = <
    T extends ContactSearchState
>({
    appState,
    useEffect,
    setAppState,
}: WithEffectParams<T>) => {
    const { env, isEnvComplete } = getEnvFromState(appState)

    useEffect(() => {
        console.info('Applying effect for contacts.')
        if (!isEnvComplete) {
            setAppState((_prevState) => ({
                ..._prevState,
                tabName: 'config',
            }))
            return
        }
        if (!appState.spacecraftName) {
            setAppState((_prevState) => ({
                ..._prevState,
                contacts: [],
            }))
            return
        }
        setAppState((_prevState) => ({
            ..._prevState,
            isContactsLoading: true,
        }))

        const params: SearchContactsParams = {
            spacecraftName: appState.spacecraftName,
            ...(env as Env),
        }
        searchContacts(params).then((contacts) => {
            setAppState((_prevState) => ({
                ..._prevState,
                isContactsLoading: false,
                contacts,
            }))
        })
    }, [appState.spacecraftName])
}
export const ScheduledContacts = <T extends ContactSearchState>({
    setAppState,
    appState,
}: WithAppState<T>) => {
    const { env, isEnvComplete } = getEnvFromState(appState)

    if (!isEnvComplete) {
        setAppState((_prevState) => ({
            ..._prevState,
            isLoading: false,
            tabName: 'config',
        }))
        return <div />
    }
    const filteredContacts = filterContacts(appState)

    const filteredSpacecrafts = filterSpacecrafts(appState)
    const emptyContactMessage = getEmptyContactsMessage({
        ...appState,
        spacecrafts: filteredSpacecrafts,
    })
    const selectParams: SpacecraftSelectParams<T> = {
        isLoading: appState.isLoading,
        isContactsLoading: appState.isContactsLoading,
        spacecraftName: appState.spacecraftName,
        ...(env as Env),
        spacecrafts: filteredSpacecrafts,
        setAppState,
    }
    return (
        <div className="container">
            <div
                className="container"
                style={{
                    marginTop: '3.7em',
                    width: '100%',
                }}
            >
                <div>
                    <label>Spacecraft</label>
                    <SpacecraftSelect {...selectParams} />
                </div>
                <table className="filterable">
                    <thead>
                        <th>Start</th>
                        {Object.entries(filterConfig).map(
                            ([key, { title }]) => (
                                <th>
                                    {title}
                                    {!appState.contacts?.length ? (
                                        ''
                                    ) : (
                                        <div className="container">
                                            <input
                                                disabled={appState.isLoading}
                                                type={'text'}
                                                value={
                                                    appState[key as FilterKey]
                                                }
                                                onKeyUp={(e) => {
                                                    const val =
                                                        e.currentTarget.value?.trim()
                                                    setAppState(
                                                        (_prevState) => ({
                                                            ..._prevState,
                                                            [key]: val,
                                                        })
                                                    )
                                                }}
                                            />
                                        </div>
                                    )}
                                </th>
                            )
                        )}
                    </thead>
                    <tbody>
                        {emptyContactMessage ? (
                            <tr>
                                <td style={{ color: '#909090' }}>
                                    {emptyContactMessage}
                                </td>
                            </tr>
                        ) : (
                            filteredContacts.map((summary) => (
                                <tr>
                                    <td>{summary.startTimeRelative}</td>
                                    <td
                                        style={{
                                            textTransform: 'capitalize',
                                            color: getStatusColor(
                                                summary.status
                                            ),
                                        }}
                                    >
                                        {summary.status}
                                    </td>
                                    <td>{summary.contactName}</td>
                                    <td>{summary.contactProfileName}</td>
                                    <td style={{ textTransform: 'capitalize' }}>
                                        {summary.groundStationName?.replace(
                                            '_',
                                            ' '
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
