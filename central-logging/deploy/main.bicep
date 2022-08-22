// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

// Parameters required to be passed in. See README for details
@description('Name prefix for name standardization')
@maxLength(20)
param namePrefix string

@description('Location for region of resources being generated')
param location string

@description('The resource group where you deployed the tcp-to-blob component')
param tcpToBlobRg string

@description('The name of the log analytics workspace that was deployed to the tcpToBlobRg')
param tcpToBlobLawName string

@description('The resource group where you deployed the Aqua processing component')
param aquaRg string

@description('The name of the log analytics workspace that was deployed to the aquaRg')
param aquaLawName string

// Auto generated parameters. DO NOT ADJUST
@description('The resource group where the central logging components will be deployed')
param aoiLoggingRgName string = '${namePrefix}-${location}-rg'

@description('Name prefix for name standardization of picky resources')
param namePrefixStripped string = replace(namePrefix, '-', '')

@description('The patterned name used for the User Assigned Managed Identity resource')
param uamiName string = '${namePrefix}-uami'

@description('The patterned name used for the Data Explorer resource')
param adxClusterName string = '${namePrefixStripped}adx'

@description('The patterned name used for the Event Hub resource')
param eventHubNamespaceName string = '${namePrefix}-eh'

targetScope = 'subscription'

@description('Creates the resource group where the central-logging components will be deployed')
resource aoiLoggingResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: aoiLoggingRgName
  location: location
}

@description('Provisions the User Assigned Managed Identity')
module uamiModule 'modules/uami.bicep' = {
  name: 'uami-module'
  scope: resourceGroup(aoiLoggingResourceGroup.name)
  params: {
    location: aoiLoggingResourceGroup.location
    uamiName: uamiName
  }
}

@description('Provisions Event Hub resources')
module ehModule 'modules/eh.bicep' = {
  name: 'eh-module'
  scope: resourceGroup(aoiLoggingResourceGroup.name)
  params: {
    location: aoiLoggingResourceGroup.location
    uamiId: uamiModule.outputs.uamiId
    uamiPrincipalId: uamiModule.outputs.uamiPrincipalId
    eventHubNamespaceName: eventHubNamespaceName
  }
  dependsOn: [
    uamiModule
  ]
}

@description('Provisions Azure Data Explorer resources')
module kustoModule 'modules/adx.bicep' = {
  name: 'adx-module'
  scope: resourceGroup(aoiLoggingResourceGroup.name)
  params: {
    location: aoiLoggingResourceGroup.location
    adxClusterName: adxClusterName
    uamiId: uamiModule.outputs.uamiId
    ehAppTracesId: ehModule.outputs.ehAppTracesId
    ehAppExceptionsId: ehModule.outputs.ehExceptionsId
    ehContainerLogId: ehModule.outputs.ehContainerLogId
    ehSyslogId: ehModule.outputs.ehSyslogId
  }
  dependsOn: [
    uamiModule
    ehModule
  ]
}

@description('Configures the tcp-to-blob Log Analytics Workspace Data Export to export logs to the central-logging Event Hub')
module contactWorkspaceConnectorModule 'modules/contact-workspace-connector.bicep' = {
  name: 'contact-workspace-connector-module'
  scope: resourceGroup(tcpToBlobRg)
  params: {
    ehNamespaceId: ehModule.outputs.ehNamespaceId
    tcpToBlobLawName: tcpToBlobLawName
  }
  dependsOn: [
    uamiModule
    ehModule
    kustoModule
  ]
}

@description('Configures the processor Log Analytics Workspace Data Export to export logs to the central-logging Event Hub')
module aquaWorkspaceConnectorModule 'modules/aqua-workspace-connector.bicep' = {
  name: 'aqua-workspace-connector-module'
  scope: resourceGroup(aquaRg)
  params: {
    ehNamespaceId: ehModule.outputs.ehNamespaceId
    aquaLawName: aquaLawName
  }
  dependsOn: [
    uamiModule
    ehModule
    kustoModule
  ]
}
