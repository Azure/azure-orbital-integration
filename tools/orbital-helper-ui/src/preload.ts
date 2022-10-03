// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { contextBridge, ipcMain, ipcRenderer } from 'electron'
import { LogsQueryClient } from '@azure/monitor-query'

import { AzureOrbital } from '@azure/arm-orbital'
import {
    checkRequiredResources as _checkRequiredResources,
    CheckRequiredResourcesParams as _CheckRequiredResourcesParams,
    GetCountsByTypeResponse,
    getEnvVar,
    makeLogger,
} from '@azure/orbital-integration-common'
import {
    ContactSummary,
    makeOrbitalHelper,
    OrbitalHelper,
    SearchScheduledContactsParams,
} from '@azure/arm-orbital-helper'
import { ResourceGraphClient } from '@azure/arm-resourcegraph'
import { DefaultAzureCredential } from '@azure/identity'

const logger = makeLogger(
    {
        subsystem: 'electron-preload',
    },
    true
)

export interface SearchContactsParams extends Env {
    spacecraftName: string
}

export type CheckRequiredResources = {
    (params: CheckRequiredResourcesParams): Promise<GetCountsByTypeResponse>
}
export type CheckRequiredResourcesParams = Omit<
    _CheckRequiredResourcesParams,
    'client'
>
const checkRequiredResources: CheckRequiredResources = async (
    params: CheckRequiredResourcesParams
) => {
    return _checkRequiredResources({
        ...params,
        client: getResourceGraphClient(),
    })
}

const searchContacts = async ({
    subscriptionId,
    location,
    resourceGroup,
    spacecraftName,
}: SearchContactsParams) => {
    const startMillis = Date.now()
    if (!spacecraftName?.trim()) {
        return []
    }
    const searchParams: SearchScheduledContactsParams = {
        spacecraftName: spacecraftName?.trim(),
    }
    const orbitalHelper = getOrbitalHelper({
        subscriptionId,
        resourceGroup,
        location,
    })
    const contacts: ContactSummary[] = []
    for await (const { summary } of orbitalHelper.searchScheduledContacts(
        searchParams
    )) {
        contacts.push(summary)
    }
    console.log(
        `Duration searchContacts: ${(Date.now() - startMillis) / 1000} seconds`
    )
    return contacts.sort(
        (a, b) =>
            new Date(b.startTimeUTC ?? 0)?.getTime() -
            new Date(a.startTimeUTC ?? 0).getTime()
    )
}

const listSpacecrafts: ListSpacecrafts = async (
    params: Partial<Env> = {}
): Promise<Spacecraft[]> => {
    const startMillis = Date.now()
    const resourceType = 'microsoft.orbital/spacecrafts'

    let query = `Resources
| where type == '${resourceType}'
| project name, type, location, subscriptionId, resourceGroup
| join kind=leftouter (ResourceContainers | where type=='microsoft.resources/subscriptions' | project subscriptionName=name, subscriptionId) on subscriptionId
| project name, location, resourceGroup, subscriptionId, subscriptionName`
    const { data } = await getResourceGraphClient().resources(
        { query },
        { resultFormat: 'jsdoc' }
    )

    console.log(
        `Duration listSpacecrafts: ${(Date.now() - startMillis) / 1000} seconds`
    )
    return data as unknown as Spacecraft[]
}

export interface GetOrbitalHelper {
    (params: Env): OrbitalHelper
}
const getOrbitalHelper: GetOrbitalHelper = ({
    location,
    resourceGroup,
    subscriptionId,
}: Env): OrbitalHelper => {
    const orbitalClient = new AzureOrbital(getCredentials(), subscriptionId)
    return makeOrbitalHelper({
        orbitalClient,
        location,
        resourceGroup,
        logger,
    })
}

const getCredentials = () => {
    return new DefaultAzureCredential()
}

const getResourceGraphClient = () => {
    return new ResourceGraphClient(getCredentials())
}

export interface ResourceBasics {
    name: string
    subscriptionId: string
    location: string
}

export const LIST_SPACECRAFT_KEY = 'list-spacecrafts'
export const SEARCH_CONTACTS_KEY = 'search-contacts'
export const SEARCH_LOGS_KEY = 'search-logs'
export const CHECK_RESOURCES_KEY = 'search-resources'

export interface SearchContacts {
    (params: SearchContactsParams): Promise<ContactSummary[]>
}

export interface Spacecraft {
    name: string
    location: string
    resourceGroup: string
    subscriptionId: string
    subscriptionName: string
}
export interface ListSpacecrafts {
    (params?: Partial<Env>): Promise<Spacecraft[]>
}

export interface Env {
    subscriptionId: string
    resourceGroup: string
    location: string
}
export interface GetEnv {
    (): Env
}

const env: Partial<Env> = JSON.parse(
    JSON.stringify({
        resourceGroup: process.env.AZ_RESOURCE_GROUP,
        location: process.env.AZ_LOCATION,
        subscriptionId: process.env.AZ_SUBSCRIPTION,
    })
)

contextBridge?.exposeInMainWorld('api', {
    searchContacts: async (params: SearchContactsParams) =>
        ipcRenderer.invoke(SEARCH_CONTACTS_KEY, params),
    searchLogs: async (params: SearchLogs) =>
        ipcRenderer.invoke(SEARCH_LOGS_KEY, params),
    listSpacecrafts: async (params: Env) =>
        ipcRenderer.invoke(LIST_SPACECRAFT_KEY, params),
    checkRequiredResources: async (params: CheckRequiredResourcesParams) =>
        ipcRenderer.invoke(CHECK_RESOURCES_KEY, params),
    env,
})

export const registerIpcMain = () => {
    ipcMain.handle(LIST_SPACECRAFT_KEY, async (e, params: Env) => {
        return listSpacecrafts(params)
    })
    ipcMain.handle(
        SEARCH_CONTACTS_KEY,
        async (e, params: SearchContactsParams) => {
            return searchContacts(params)
        }
    )
    ipcMain.handle(SEARCH_LOGS_KEY, async (e, params: SearchLogsParams) => {
        return searchEventLogs({
            client: new LogsQueryClient(getCredentials()),
            ...params,
        })
    })
    ipcMain.handle(
        CHECK_RESOURCES_KEY,
        async (e, params: CheckRequiredResourcesParams) => {
            return checkRequiredResources(params)
        }
    )
}

export interface SearchLogsParams {
    logAnalyticsWorkspaceName: string
    subsystem?: string
    event?: string
    message?: string
}
export type EventLogEntry = {
    timestamp: Date
    subsystem: string
    event: string
    message: string
}
export interface SearchLogs {
    (params: Omit<SearchLogsParams, 'client'>): Promise<{
        logs: EventLogEntry[]
    }>
}
const searchEventLogs = async (
    params: SearchLogsParams & { client: LogsQueryClient }
): Promise<{ logs: EventLogEntry[] }> => {
    const startMillis = Date.now()

    let query: string = `ContainerLog
 | extend _data = parse_json(LogEntry)
 | where _data.subsystem != ''`
    const _params = params as unknown as any
    for (const prop of ['subsystem', 'event']) {
        if (_params[prop]) {
            query = `${query}
 | where _data.${prop} == '${_params[prop]}'`
        }
    }
    if (params.message) {
        query = `${query}
 | where _data.massage has '${params.message}'`
    }
    query = `${query}
 | sort by TimeGenerated desc
 | project TimeGenerated, LogEntry`

    const lawId = await getLawId({ name: params.logAnalyticsWorkspaceName })
    const res = await params.client.queryWorkspace(lawId, query, {
        startTime: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        endTime: new Date(),
    })
    const rows = (res as unknown as any)['tables'][0]['rows'] as any[]
    console.log(`duration: ${(Date.now() - startMillis) / 1000}} seconds`)
    return {
        logs: rows.map(([timestamp, json]) => ({
            timestamp,
            ...JSON.parse(json),
        })) as unknown as EventLogEntry[],
    }
}

let lawIdMap: { [lawName: string]: string } = {}

const getLawId = async ({ name }: { name: string }) => {
    const resourceClient = new ResourceGraphClient(getCredentials())
    if (lawIdMap[name]) {
        console.log(`law ID cache hit for ${name}.`)
        return lawIdMap[name]
    }
    console.log(`law ID cache MISS :( Querying for for ${name}.`)
    const query = `Resources
    | where name == '${name}'`
    const { data } = await resourceClient.resources(
        { query },
        { resultFormat: 'jsdoc' }
    )
    const errMessage = `No log analytics workspace found named "${name}".`
    if (data.length !== 1) {
        throw new Error(errMessage)
    }
    const lawId = data[0]?.properties?.customerId
    if (!lawId) {
        throw new Error(`No log analytics workspace found named "${name}".`)
    }
    lawIdMap[name] = lawId
    return lawId
}

