// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h, render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import {
    AppState,
    getEnvFromState,
    TabName,
    WithAppState,
    WithEffect,
} from './appState'
import {
    applyEffect as applyEffectForContacts,
    ScheduledContacts,
} from './contacts'
import { applyEffect as applyEffectForConfig, Config } from './config'

import { makeAPI } from './api'
import { applyEffect as applyEffectForHealth, Health } from './health'

const { getEnv } = makeAPI()

interface ContentMaker {
    (params: WithAppState): h.JSX.Element
}
interface TabMapItem {
    title: string
    applyEffect: WithEffect
    contentMaker: ContentMaker
}
const tabMap: { [name: string]: TabMapItem } = {
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
}: { tabName: TabName } & Pick<WithAppState, 'setAppState'>) => {
    return (
        <nav>
            <ul>
                {Object.keys(tabMap).map((_currentTabName) => (
                    <li>
                        <a
                            className={
                                tabName === _currentTabName ? 'active' : ''
                            }
                            href="#home"
                            onClick={() =>
                                setAppState((_prevState) => ({
                                    ..._prevState,
                                    tabName: _currentTabName as TabName,
                                }))
                            }
                        >
                            {tabMap[_currentTabName].title}
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
    const updateAppState = (newState: Partial<AppState>) => {
        setAppState((previousState) => ({
            ...previousState,
            ...newState,
        }))
    }

    for (const [_tabName, { applyEffect }] of Object.entries(tabMap)) {
        console.info(`Applying effect for ${_tabName}.`)
        applyEffect({
            useEffect,
            appState,
            updateAppState,
            setAppState,
        })
    }

    useEffect(() => {
        console.info('index useEffect')
        updateAppState({
            ...getEnv(),
        })
    }, [])

    const { isEnvComplete } = getEnvFromState(appState)

    let contentMaker: ContentMaker = Config
    if (isEnvComplete && tabMap[appState.tabName]) {
        contentMaker = tabMap[appState.tabName].contentMaker
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
                {contentMaker({
                    appState: appState,
                    updateAppState,
                    setAppState,
                })}
            </div>
        </div>
    )
}

render(<App />, document.getElementById('app') as HTMLInputElement)
