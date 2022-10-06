// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { ResourceGraphClient } from '@azure/arm-resourcegraph'

export interface ResourceBasics {
    name: string
    subscriptionId: string
    location: string
}

export interface Env {
    subscriptionId: string
    resourceGroup: string
    location: string
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

export interface ResourceGraphHelper {
    searchResources: SearchResources
}

export interface WithResourceGraphClient {
    client: ResourceGraphClient
}
export const makeResourceGraphHelper = ({
    client,
}: WithResourceGraphClient): ResourceGraphHelper => {
    const searchResources: SearchResources = async (
        params: SearchResourcesParams
    ): Promise<SearchResourcesResponse[]> => {
        const startMillis = Date.now()

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
        const { data } = await client.resources(
            { query },
            { resultFormat: 'jsdoc' }
        )

        console.log(
            `Duration searchResources: ${
                (Date.now() - startMillis) / 1000
            } seconds`
        )
        return data as unknown as SearchResourcesResponse[]
    }

    return {
        searchResources,
    }
}
