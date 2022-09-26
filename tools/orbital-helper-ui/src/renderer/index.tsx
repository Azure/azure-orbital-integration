// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h, render } from 'preact'
import { StateUpdater, useEffect, useState } from 'preact/hooks'
import {
    AppState,
    getEnvFromState,
    TabName,
    WithAppState,
    WithEffect,
    WithStateUpdater,
} from './appState'
import {
    applyEffect as applyEffectForContacts,
    ContactSearchState,
    ScheduledContacts,
} from './contacts'
import {
    applyEffect as applyEffectForConfig,
    Config,
    ConfigState,
} from './config'

import { makeAPI } from './api'
import {
    applyEffect as applyEffectForHealth,
    Health,
    HealthState,
} from './health'

const { getEnv } = makeAPI()

interface ContentMaker {
    (params: WithAppState<AppState>): h.JSX.Element
}

interface TabMapItem {
    title: string
    applyEffect: WithEffect<Partial<AppState>> | undefined
    contentMaker: ContentMaker
}
const tabMap: { [tabName: string]: TabMapItem } = {
    contacts: {
        title: 'Contacts',
        contentMaker: ScheduledContacts,
        applyEffect: applyEffectForContacts,
    },
    health: {
        title: 'Health',
        contentMaker: Health,
        applyEffect: applyEffectForHealth,
    },
    config: {
        title: 'Config',
        contentMaker: Config,
        applyEffect: applyEffectForConfig,
    },
}
const Nav = ({
    tabName,
    setAppState,
}: { tabName: TabName } & WithStateUpdater<AppState>) => {
    return (
        <nav>
            <ul>
                {Object.keys(tabMap).map((_currentTabName) => (
                    <li>
                        <a
                            className={
                                tabName === _currentTabName ? 'active' : ''
                            }
                            href="#"
                            onClick={() =>
                                setAppState((_prevState) => ({
                                    ..._prevState,
                                    tabName: _currentTabName as TabName,
                                }))
                            }
                        >
                            {tabMap[_currentTabName as TabName].title}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    )
}
const App = () => {
    const [appState, setAppState] = useState<AppState>({
        tabName: 'config',
        subscriptionId: '',
        resourceGroup: '',
        spacecraftName: '',
    })

    for (const [_tabName, { applyEffect }] of Object.entries(tabMap)) {
        if (applyEffect !== undefined) {
            applyEffect({
                useEffect,
                appState: appState as ConfigState &
                    HealthState &
                    ContactSearchState,
                setAppState: setAppState as StateUpdater<Partial<AppState>>,
            })
        }
    }

    useEffect(() => {
        console.info('index useEffect')
        setAppState((_prevState) => ({
            ..._prevState,
            ...getEnv(),
        }))
    }, [])

    const { isEnvComplete } = getEnvFromState(appState)

    let MakeContent: ContentMaker = Config
    if (isEnvComplete && tabMap[appState.tabName]) {
        MakeContent = tabMap[appState.tabName].contentMaker
    }

    return (
        <div className="container">
            <Nav tabName={appState.tabName} setAppState={setAppState} />

            <div
                style={{
                    marginTop: '3.7em',
                    marginLeft: '40px',
                    marginRight: '40px',
                    width: 'calc(100% - 80px)',
                }}
            >
                <MakeContent appState={appState} setAppState={setAppState} />
            </div>
        </div>
    )
}

render(<App />, document.getElementById('app') as HTMLInputElement)
