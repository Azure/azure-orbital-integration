/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

@description('Location or region for the virtual machine and other resources being created')
param location string

@description('This is your public IP address so that you are able to SSH into the Aqua processor VM')
param allowedSshIpAddress string

@description('This is your machines public key. During script execution, this key is automatically retrieved')
@secure()
param adminPublicKey string

@description('Name prefix for name standardization')
@maxLength(20)
param namePrefix string

@description('Name prefix for name standardization of picky resources')
param namePrefixStripped string = replace(namePrefix, '-', '')

@description('The resource group where the aqua processor components will be deployed')
param aquaProcessorRg string = '${namePrefix}-rg'

targetScope = 'subscription'

@description('Creates the resource group where the central-logging components will be deployed')
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


@description('Provisions the Aqua processor VM resource')
module aquaProcessorVm 'modules/aqua-processor-vm.bicep' = {
  name: 'aqua-processor-vm'
  scope: resourceGroup(aoiLoggingResourceGroup.name)
  params: {
    location: location
    namePrefix: namePrefix
    allowedSshIpAddress: allowedSshIpAddress
    adminPublicKey: adminPublicKey
    storageAccountName: storageAccountModule.name
    storageAccountEndpoint: storageAccountModule.outputs.saBlob
    storageAccountToken: storageAccountModule.outputs.saToken
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
    aquaProcessorVmName: aquaProcessorVm.outputs.aquaProcessorVmName
  }
}

output storageAccountSas string = storageAccountModule.outputs.saToken
