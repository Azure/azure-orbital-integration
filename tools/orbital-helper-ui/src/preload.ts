// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { contextBridge, ipcMain, ipcRenderer } from 'electron'
import { AzureOrbital } from '@azure/arm-orbital'
import {
    ContactSummary,
    getOptionalEnvVar,
    makeOrbitalHelper,
    OrbitalHelper,
    SearchScheduledContactsParams,
} from '@azure/arm-orbital-helper'
import { DefaultAzureCredential } from '@azure/identity'
import { ResourceGraphClient } from '@azure/arm-resourcegraph'

export interface SearchContactsParams extends Env {
    spacecraftName: string
}

const searchContacts = async ({
    subscriptionId,
    location,
    resourceGroup,
    spacecraftName,
}: SearchContactsParams) => {
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

export interface SearchResourcesParams extends Partial<Env> {
    resourceNamePrefix: string
}
export type SearchResourcesResponse = ResourceBasics & {
    type: string
}
export interface SearchResources {
    (params: SearchResourcesParams): Promise<SearchResourcesResponse[]>
}
const searchResources: SearchResources = async (
    params: SearchResourcesParams
): Promise<SearchResourcesResponse[]> => {
    const startMillis = Date.now()
    const resourceType = 'microsoft.orbital/spacecrafts'

    let query = `Resources
| where name startswith '${params.resourceNamePrefix}'
| project name, type, location, subscriptionId, resourceGroup
| join kind=leftouter (ResourceContainers | where type=='microsoft.resources/subscriptions' | project subscriptionName=name, subscriptionId) on subscriptionId
| project name, location, resourceGroup, subscriptionId, subscriptionName, type`
    if (params?.location) {
        query = `${query}
        | where location=~'${params?.location}'`
    }
    if (params?.resourceGroup) {
        query = `${query}
        | where resourceGroup=~'${params?.resourceGroup}'`
    }
    if (params?.subscriptionId) {
        query = `${query}
        | where subscriptionId=~'${params?.subscriptionId}'`
    }
    const { data } = await getResourceGraphClient().resources(
        { query },
        { resultFormat: 'jsdoc' }
    )

    console.log(
        `Duration searchResources: ${(Date.now() - startMillis) / 1000} seconds`
    )
    return data as unknown as SearchResourcesResponse[]
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
export const SEARCH_RESOURCES_KEY = 'search-resources'

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
    listSpacecrafts: async (params: Env) =>
        ipcRenderer.invoke(LIST_SPACECRAFT_KEY, params),
    searchResources: async (params: SearchResourcesParams) =>
        ipcRenderer.invoke(SEARCH_RESOURCES_KEY, params),
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
    ipcMain.handle(
        SEARCH_RESOURCES_KEY,
        async (e, params: SearchResourcesParams) => {
            return searchResources(params)
        }
    )
}
