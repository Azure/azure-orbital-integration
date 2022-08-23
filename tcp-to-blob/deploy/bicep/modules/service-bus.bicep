// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

param location string
param namePrefixStripped string

@description('The Service Bus namespace name')
param serviceBusNamespaceName string = '${namePrefixStripped}sb'

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-01-01-preview' = {
  name: serviceBusNamespaceName
  location: location
  sku: {
    capacity: 1
    name: 'Standard'
    tier: 'Standard'
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces/queues?pivots=deployment-language-bicep')
resource serviceBusContactDataQueue 'Microsoft.ServiceBus/namespaces/queues@2022-01-01-preview' = {
  name: 'contact-data'
  parent: serviceBusNamespace
  properties: {
    maxMessageSizeInKilobytes: 256
    lockDuration: 'PT30S'
    maxSizeInMegabytes: 1024
    requiresDuplicateDetection: false
    requiresSession: false
    defaultMessageTimeToLive: 'P14D'
    deadLetteringOnMessageExpiration: false
    enableBatchedOperations: true
    duplicateDetectionHistoryTimeWindow: 'PT10M'
    maxDeliveryCount: 10
    status: 'Active'
    autoDeleteOnIdle: 'P3650D'
    enablePartitioning: false
    enableExpress: false
  }
}

output serviceBusContactDataQueueId string = serviceBusContactDataQueue.id
