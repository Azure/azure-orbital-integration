// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

@description('The resource id of the Service Bus queue')
param serviceBusContactDataQueueId string

@description('Storage account name.')
@maxLength(24)
param name string = 'storage${uniqueString(resourceGroup().id)}'

@description('Storage account location.')
param location string = resourceGroup().location

resource rscStorage 'Microsoft.Storage/storageAccounts@2021-09-01' = {
  name: name
  location: location
  sku: {
    name: 'Standard_RAGRS'
  }
  kind: 'StorageV2'
  properties: {
    defaultToOAuthAuthentication: false
    publicNetworkAccess: 'Enabled'
    allowCrossTenantReplication: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      virtualNetworkRules: []
      ipRules: []
      defaultAction: 'Allow'
    }
    supportsHttpsTrafficOnly: true
    encryption: {
      requireInfrastructureEncryption: false
      services: {
        file: {
          keyType: 'Account'
          enabled: true
        }
        blob: {
          keyType: 'Account'
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
    accessTier: 'Hot'
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.eventgrid/systemtopics?pivots=deployment-language-bicep')
resource eventGridSystemTopic 'Microsoft.EventGrid/systemTopics@2022-06-15' = {
  name: '${name}-contact-data-created'
  location: location
  properties: {
    source: rscStorage.id
    topicType: 'Microsoft.Storage.StorageAccounts'
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.eventgrid/systemtopics/eventsubscriptions?pivots=deployment-language-bicep')
resource eventSubscription 'Microsoft.EventGrid/systemTopics/eventSubscriptions@2021-12-01' = {
  parent: eventGridSystemTopic
  name: '${name}-ContactDataCreated'
  properties: {
    destination: {
      endpointType: 'ServiceBusQueue'
      properties: {
        resourceId: serviceBusContactDataQueueId
      }
    }
    filter: {
      includedEventTypes: [
        'Microsoft.Storage.BlobCreated'
      ]
      // https://github.com/Azure/azure-orbital-integration/issues/118
      subjectBeginsWith: '/blobServices/default/containers/raw-contact-data'
    }
  }
}
