/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

@description('Location or region for the virtual machine and other resources being created')
param location string

@description('Name prefix for name standardization')
param namePrefix string

@description('Name prefix for name standardization of picky resources')
param namePrefixStripped string = replace(namePrefix, '-', '')

@description('The resource group where the aqua processor components will be deployed')
param aquaProcessorRg string = '${namePrefix}-${location}-rg'

targetScope = 'subscription'

@description('Creates the resource group where the aqua-processor components will be deployed')
resource aoiLoggingResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: aquaProcessorRg
  location: location
}

@description('Provisions the storage account resource')
module storageAccountModule 'modules/storage-account.bicep' = {
  name: 'storage-account'
  scope: resourceGroup(aoiLoggingResourceGroup.name)
  params: {
    location: location
    namePrefixStripped: namePrefixStripped
  }
}

@description('Provisions Log Analytics Workspace and Application Insights resources')
module analyticsModule 'modules/analytics.bicep' = {
  name: 'analyticsDeployment'
  scope: resourceGroup(aoiLoggingResourceGroup.name)
  params: {
    location: location
    namePrefix: namePrefix
    namePrefixStripped: namePrefixStripped
  }
}

output storageAccountName string = storageAccountModule.outputs.storageAccountName
output applicationInsightsName string = analyticsModule.outputs.applicationInsightsName
output applicationInsightsRg string = analyticsModule.outputs.applicationInsightsRg
