// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

// Please see main.bicep for param descriptions
param tcpToBlobLawName string

@description('The resource id of the Event Hub Namespace')
param ehNamespaceId string

@description('https://docs.microsoft.com/en-us/azure/templates/Microsoft.OperationalInsights/workspaces?pivots=deployment-language-bicep')
resource tcpToBlobLawRef 'Microsoft.OperationalInsights/workspaces@2021-12-01-preview' existing = {
  name: tcpToBlobLawName
}

// The following section will will configure Data Export rules to be exported to the central ADX instance
// https://docs.microsoft.com/en-us/azure/templates/Microsoft.OperationalInsights/workspaces/dataExports?pivots=deployment-language-bicep
resource tcpToBlobLawExportContainerLog 'Microsoft.OperationalInsights/workspaces/dataExports@2020-08-01' = {
  name: 'Export-ContainerLog'
  parent: tcpToBlobLawRef
  properties: {
    destination: {
      metaData: {
        eventHubName: 'containerlog'
      }
      resourceId: ehNamespaceId
    }
    enable: true
    tableNames: [
      'ContainerLog'
    ]
  }
}
