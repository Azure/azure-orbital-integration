// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { ContactSearchState } from './contacts'
import { ConfigState } from './config'
import { Env } from '../preload'
import { StateUpdater } from 'preact/compat'
import { HealthState } from './health'
import { LogsState } from './logs'
import { EffectCallback, Inputs } from 'preact/hooks'

/**
 * These interfaces are in a different file than renderer/index.tsx to
 * avoid issues apparently caused by circular imports in preact.
 */
export type TabName = 'contacts' | 'health' | 'config'

export interface WithIsLoading {
    isLoading?: boolean
}
export type AppState = { tabName: TabName } & Partial<ContactSearchState> &
    Partial<ConfigState> &
    Partial<HealthState> &
    Partial<LogsState>

export interface WithStateUpdater<T extends Partial<AppState>> {
    setAppState: StateUpdater<T>
}
export interface WithAppState<T extends Partial<AppState>>
    extends WithStateUpdater<T> {
    appState: T
}

export type WithEffectParams<T extends Partial<AppState>> = WithAppState<T> & {
    useEffect: (effect: EffectCallback, inputs?: Inputs | undefined) => void
}
export interface WithEffect<T extends Partial<AppState>> {
    (params: WithEffectParams<T>): void
}

export const getEnvFromState = <
    T extends Pick<AppState, 'subscriptionId' | 'location' | 'resourceGroup'>
>(
    state: T
) => {
    const env: Partial<Env> = {
        subscriptionId: state.subscriptionId,
        resourceGroup: state.resourceGroup,
        location: state.location,
    }
    const isEnvComplete = !!(
        env.location &&
        env.resourceGroup &&
        env.subscriptionId
    )
    return {
        env,
        isEnvComplete,
    }
}
