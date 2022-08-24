/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

// Please see main.bicep for param descriptions
param location string
param namePrefixStripped string

@description('Specifies the name of the Azure Storage account.')
param storageAccountName string = namePrefixStripped

@description('Specifies the name of the blob container.')
param containerName string = 'logs'

@description('Expiration time of the key')
param keyExpiration string = dateTimeFromEpoch(dateTimeToEpoch(dateTimeAdd(utcNow(), 'PT2H')))

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts?pivots=deployment-language-bicep')
resource aquaProcessingStorageAccount 'Microsoft.Storage/storageAccounts@2021-06-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/blobservices/containers?pivots=deployment-language-bicep')
resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-06-01' = {
  name: '${aquaProcessingStorageAccount.name}/default/${containerName}'
}

@description('https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-resource')
var storageSasToken = listAccountSas(aquaProcessingStorageAccount.name, '2021-09-01', {
    signedServices: 'b'
    signedResourceTypes: 'o'
    signedPermission: 'rwdlacup'
    signedProtocol: 'https'
    signedExpiry: keyExpiration
    keyToSign: 'key1'
  }).accountSasToken

output storageAccountName string = aquaProcessingStorageAccount.name
output storageAccountBlobEndpoint string = aquaProcessingStorageAccount.properties.primaryEndpoints.blob
output storageAccountSasToken string = storageSasToken
