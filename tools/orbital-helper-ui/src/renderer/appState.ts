// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { ContactSearchState } from './contacts'
import { ConfigState } from './config'
import { Env } from '../preload'
import { StateUpdater } from 'preact/compat'
import { HealthState } from './health'
import { EffectCallback, Inputs } from 'preact/hooks'

/**
 * These interfaces are in a different file than renderer/index.tsx to
 * avoid issues apparently caused by circular imports in preact.
 */
export type TabName = 'contacts' | 'health' | 'config'

export type AppState = { tabName: TabName } & Partial<ContactSearchState> &
    Partial<ConfigState> &
    Partial<HealthState>

export interface WithAppState {
    appState: AppState
    updateAppState: (newState: Partial<AppState>) => void
    setAppState: StateUpdater<AppState>
}

export type WithEffectParams = WithAppState & {
    useEffect: (effect: EffectCallback, inputs?: Inputs | undefined) => void
}
export interface WithEffect {
    (params: WithEffectParams): void
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
