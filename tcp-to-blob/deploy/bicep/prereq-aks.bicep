// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

// Variables 
@description('Location for region of resources being generated')
param location string = resourceGroup().location

@description('Name prefix for name standardization')
param namePrefix string = uniqueString(resourceGroup().id)

@description('Name prefix for name standardization of picky resources')
param namePrefixStripped string = replace(namePrefix, '-', '')

@description('Resource group for ACR')
param acrResourceGroup string = resourceGroup().name

@description('Name of azure container registry')
param acrName string = '${namePrefixStripped}acr'

@description('Resource group for storage account')
param storageAccountResourceGroup string = resourceGroup().name

@description('Name of storage account')
@maxLength(24)
param storageAccountName string = namePrefixStripped

@description('Provisions Azure Container Registry to store the required tcp-to-blob image')
module acrModule 'acr.bicep' = {
  name: '${namePrefix}-acr-module'
  scope: resourceGroup(acrResourceGroup)
  params: {
    name: acrName
    location: location
  }
}

@description('Provisions Service Bus for receiving Event Grid messages')
module serviceBusModule 'modules/service-bus.bicep' = {
  name: '${namePrefix}-service-bus-module'
  scope: resourceGroup(acrResourceGroup)
  params: {
    location: location
    namePrefixStripped: namePrefixStripped
  }
}

@description('Provisions the storage account used for collecting contact data')
module storageModule 'storage.bicep' = {
  name: '${namePrefix}-storage-module'
  scope: resourceGroup(storageAccountResourceGroup)
  params: {
    name: storageAccountName
    location: location
    serviceBusContactDataQueueId: serviceBusModule.outputs.serviceBusContactDataQueueId
  }
}
