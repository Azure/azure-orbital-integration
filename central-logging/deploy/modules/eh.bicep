// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

// Please see main.bicep for param descriptions
param eventHubNamespaceName string
param location string

@description('The User Assigned Managed Identity resource id')
param uamiId string

@description('The User Assigned Managed Identity principal id')
param uamiPrincipalId string

@description('https://docs.microsoft.com/en-us/azure/templates/Microsoft.EventHub/namespaces?pivots=deployment-language-bicep')
resource aoiLoggingEventHubNamespace 'Microsoft.EventHub/namespaces@2022-01-01-preview' = {
  name: eventHubNamespaceName
  location: location
  sku: {
    capacity: 1
    name: 'standard'
    tier: 'standard'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uamiId}': {}
    }
  }
  properties: {
    isAutoInflateEnabled: false
  }
}

// The following 4-sections generate event hubs used for data export
// https://docs.microsoft.com/en-us/azure/templates/Microsoft.EventHub/namespaces/eventhubs?pivots=deployment-language-bicep
resource aoiEventHubAppTraces 'Microsoft.EventHub/namespaces/eventhubs@2022-01-01-preview' = {
  name: 'apptraces'
  parent: aoiLoggingEventHubNamespace
  properties: {
    partitionCount: 4
  }
}

resource aoiEventHubAppExceptions 'Microsoft.EventHub/namespaces/eventhubs@2022-01-01-preview' = {
  name: 'appexceptions'
  parent: aoiLoggingEventHubNamespace
  properties: {
    partitionCount: 4
  }
}

resource aoiEventHubContainerLog 'Microsoft.EventHub/namespaces/eventhubs@2022-01-01-preview' = {
  name: 'containerlog'
  parent: aoiLoggingEventHubNamespace
  properties: {
    partitionCount: 4
  }
}

resource aoiEventHubSyslog 'Microsoft.EventHub/namespaces/eventhubs@2022-01-01-preview' = {
  name: 'syslog'
  parent: aoiLoggingEventHubNamespace
  properties: {
    partitionCount: 4
  }
}

// The following 4-sections create consumers that the ADX Data connections will leverage for import
// https://docs.microsoft.com/en-us/azure/templates/Microsoft.EventHub/namespaces/eventhubs/consumergroups?pivots=deployment-language-bicep
resource aoiEventHubAppTracesKustoConsumer 'Microsoft.EventHub/namespaces/eventhubs/consumergroups@2022-01-01-preview' = {
  name: 'kusto'
  parent: aoiEventHubAppTraces
}

resource aoiEventHubAppExceptionsKustoConsumer 'Microsoft.EventHub/namespaces/eventhubs/consumergroups@2022-01-01-preview' = {
  name: 'kusto'
  parent: aoiEventHubAppExceptions
}

resource aoiEventHubContainerLogKustoConsumer 'Microsoft.EventHub/namespaces/eventhubs/consumergroups@2022-01-01-preview' = {
  name: 'kusto'
  parent: aoiEventHubContainerLog
}

resource aoiEventHubSyslogKustoConsumer 'Microsoft.EventHub/namespaces/eventhubs/consumergroups@2022-01-01-preview' = {
  name: 'kusto'
  parent: aoiEventHubSyslog
}

// The following 4-sections handles granting the UAMI 'Azure Event Hubs Data Receiver' role for
// all of the event hubs. This role is required when we setup the data connections in ADX
// https://docs.microsoft.com/en-us/azure/templates/Microsoft.Authorization/roleAssignments?pivots=deployment-language-bicep
var dataReceiverId = 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde'
var fullDataReceiverId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', dataReceiverId)

var eventHubRoleAssignmentNameAppTraces = '${resourceGroup().id}${eventHubNamespaceName}${dataReceiverId}${aoiEventHubAppTraces.name}'
var roleAssignmentNameAppTraces = guid(eventHubRoleAssignmentNameAppTraces, aoiEventHubAppTraces.name, dataReceiverId, eventHubNamespaceName)
resource clusterEventHubAuthorizationAppTraces 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: roleAssignmentNameAppTraces
  scope: aoiEventHubAppTraces
  properties: {
    description: 'Give "Azure Event Hubs Data Receiver" Managed Identity'
    principalId: uamiPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: fullDataReceiverId
  }
}

var eventHubRoleAssignmentNameAppExceptions = '${resourceGroup().id}${eventHubNamespaceName}${dataReceiverId}${aoiEventHubAppExceptions.name}'
var roleAssignmentNameAppExceptions = guid(eventHubRoleAssignmentNameAppExceptions, aoiEventHubAppExceptions.name, dataReceiverId, eventHubNamespaceName)
resource clusterEventHubAuthorizationAppExceptions 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: roleAssignmentNameAppExceptions
  scope: aoiEventHubAppExceptions
  properties: {
    description: 'Give "Azure Event Hubs Data Receiver" Managed Identity'
    principalId: uamiPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: fullDataReceiverId
  }
}

var eventHubRoleAssignmentNameContainerLog = '${resourceGroup().id}${eventHubNamespaceName}${dataReceiverId}${aoiEventHubContainerLog.name}'
var roleAssignmentNameContainerLog = guid(eventHubRoleAssignmentNameContainerLog, aoiEventHubContainerLog.name, dataReceiverId, eventHubNamespaceName)
resource clusterEventHubAuthorizationContainerLog 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: roleAssignmentNameContainerLog
  scope: aoiEventHubContainerLog
  properties: {
    description: 'Give "Azure Event Hubs Data Receiver" Managed Identity'
    principalId: uamiPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: fullDataReceiverId
  }
}

var eventHubRoleAssignmentNameSyslog = '${resourceGroup().id}${eventHubNamespaceName}${dataReceiverId}${aoiEventHubSyslog.name}'
var roleAssignmentNameSyslog = guid(eventHubRoleAssignmentNameSyslog, aoiEventHubSyslog.name, dataReceiverId, eventHubNamespaceName)
resource clusterEventHubAuthorizationSyslog 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: roleAssignmentNameSyslog
  scope: aoiEventHubSyslog
  properties: {
    description: 'Give "Azure Event Hubs Data Receiver" Managed Identity'
    principalId: uamiPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: fullDataReceiverId
  }
}

output ehNamespaceId string = aoiLoggingEventHubNamespace.id
output ehAppTracesId string = aoiEventHubAppTraces.id
output ehExceptionsId string = aoiEventHubAppExceptions.id
output ehContainerLogId string = aoiEventHubContainerLog.id
output ehSyslogId string = aoiEventHubSyslog.id
