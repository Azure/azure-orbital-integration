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
@maxLength(24)
param storageAccountResourceGroup string = resourceGroup().name

@description('Name of storage account')
param storageAccountName string = '${namePrefixStripped}storage'

// TO support ACR in seperate resource group, it must be created via separate module.
module acrModule 'acr.bicep' = {
  name: 'acr-module'
  scope: resourceGroup(acrResourceGroup)
  params: {
    name: acrName
    location: location
  }
}

// TO support storage account in seperate resource group, it must be created via separate module.
module storageModule 'storage.bicep' = {
  name: 'storage-module'
  scope: resourceGroup(storageAccountResourceGroup)
  params: {
    name: storageAccountName
    location: location
  }
}
