// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import {
    Env,
    makeResourceGraphHelper,
    SearchResourcesResponse,
    WithResourceGraphClient,
} from './resource-graph'

interface RequiredResourceMap {
    [key: string]: {
        title: string
        nameSuffix?: string
    }
}

const requiredNormalNamedResourceTypeMap: RequiredResourceMap = {
    'microsoft.network/virtualnetworks': {
        title: 'VNet',
        nameSuffix: '-vnet',
    },
    'microsoft.containerservice/managedclusters': {
        title: 'AKS Cluster',
        nameSuffix: '-aks',
    },
    'microsoft.managedidentity/userassignedidentities': {
        title: 'AKS Identity',
        nameSuffix: '-aks-control-plane-identity',
    },
    'microsoft.orbital/contactprofiles': {
        title: 'Orbital Contact Profile',
        nameSuffix: '-aks-cp',
    },
    'microsoft.portal/dashboards': {
        title: 'ADO Dashboard',
        nameSuffix: '-dashboard',
    },
    'microsoft.operationalinsights/workspaces': {
        title: 'Log Analytics Workspace',
        nameSuffix: '-law',
    },
}

const requiredRestrictedNamedResourceTypeMap: RequiredResourceMap = {
    'Microsoft.Storage/storageAccounts': {
        title: 'Storage account',
    },
    'Microsoft.ContainerRegistry/registries': {
        title: 'ACR',
        nameSuffix: 'acr',
    },

    'Microsoft.EventGrid/systemTopics': {
        title: 'Event grid topic',
        nameSuffix: '-contact-data-created',
    },
    'Microsoft.ServiceBus/Namespaces': {
        title: 'Service bus namespace',
        nameSuffix: 'sb',
    },
}

export interface TypeMetric {
    title: string
    count: number
    names?: string[]
}
export type GetCountsByTypeResponse = {
    isHealthy: boolean
    typeMetrics: {
        [type: string]: TypeMetric
    }
    message?: string
}
export interface WithResources {
    resources?: SearchResourcesResponse[]
}

interface GetCountsByResourceTypeParams extends WithResources {
    resourceNamePrefix: string
    requiredResourceTypeMap: RequiredResourceMap
}

const getCountsByResourceType = ({
    resourceNamePrefix,
    resources,
    requiredResourceTypeMap,
}: GetCountsByResourceTypeParams): GetCountsByTypeResponse => {
    const res: GetCountsByTypeResponse = {
        isHealthy: true,
        typeMetrics: {},
    }
    for (const [type, { nameSuffix, title }] of Object.entries(
        requiredResourceTypeMap
    )) {
        const typeMetric: TypeMetric = {
            title,
            count: 0,
            names: [],
        }

        for (const _resource of resources ?? []) {
            if (
                _resource.type?.toLowerCase() === type?.toLowerCase() &&
                _resource.name === `${resourceNamePrefix}${nameSuffix ?? ''}`
            ) {
                typeMetric.count = typeMetric.count + 1
                typeMetric.names?.push(_resource.name)
                if (typeMetric.count > 1) {
                    res.isHealthy = false
                    res.message = `Multiple resources found of same type. Use more specific prefix.`
                }
            }
        }

        if (typeMetric.count < 1) {
            res.isHealthy = false
            res.message = `Missing one or more required resources.`
        }

        res.typeMetrics[type] = typeMetric
    }

    return res
}

export interface CheckRequiredResourcesParams
    extends WithResourceGraphClient,
        Env {
    resourceNamePrefix: string
}
export const checkRequiredResources = async ({
    client,
    resourceNamePrefix,
    ...env
}: CheckRequiredResourcesParams): Promise<GetCountsByTypeResponse> => {
    const restrictedResourceNamePrefix = resourceNamePrefix.replace('-', '')
    const { searchResources } = makeResourceGraphHelper({ client })
    const promises = [
        {
            resourceNamePrefix,
            requiredResourceTitleMap: requiredNormalNamedResourceTypeMap,
        },
        {
            resourceNamePrefix: restrictedResourceNamePrefix,
            requiredResourceTitleMap: requiredRestrictedNamedResourceTypeMap,
        },
    ].map(({ resourceNamePrefix, requiredResourceTitleMap }) =>
        searchResources({
            resourceNamePrefix,
            ...env,
        }).then((resources) =>
            getCountsByResourceType({
                resourceNamePrefix,
                resources,
                requiredResourceTypeMap: requiredResourceTitleMap,
            })
        )
    )
    const [normalNameResourceResults, restrictedNameResourceResults] =
        await Promise.all(promises)
    const res: GetCountsByTypeResponse = {
        isHealthy:
            normalNameResourceResults.isHealthy &&
            restrictedNameResourceResults.isHealthy,
        message:
            normalNameResourceResults.message ??
            restrictedNameResourceResults.message,
        typeMetrics: {
            ...normalNameResourceResults.typeMetrics,
            ...restrictedNameResourceResults.typeMetrics,
        },
    }
    return res
}
