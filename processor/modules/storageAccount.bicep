/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

@description('Location or region for the virtual machine and other resources being created')
param location string

@description('Specifies the name of the Azure Storage account.')
param storageAccountName string

@description('Specifies the name of the blob container.')
param containerName string

@description('Expiration time of the key')
param keyExpiration string


resource stvm 'Microsoft.Storage/storageAccounts@2021-06-01' = {
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

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-06-01' = {
  name: '${stvm.name}/default/${containerName}'
}

var storageSasToken = listAccountSas(stvm.name, '2021-09-01', {
  signedServices: 'b'
  signedResourceTypes: 'o'
  signedPermission: 'rwdlacup'
  signedProtocol: 'https'
  signedExpiry: keyExpiration
  keyToSign: 'key1'
}).accountSasToken

output saName string = stvm.name
output saBlob string = stvm.properties.primaryEndpoints.blob
output token string = storageSasToken
