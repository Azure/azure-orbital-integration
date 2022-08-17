// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

// Please see main.bicep for param descriptions
param aquaLawName string

@description('The resource id of the Event Hub Namespace')
param ehNamespaceId string

@description('https://docs.microsoft.com/en-us/azure/templates/Microsoft.OperationalInsights/workspaces?pivots=deployment-language-bicep')
resource aquaLawRef 'Microsoft.OperationalInsights/workspaces@2021-12-01-preview' existing = {
  name: aquaLawName
}

// The following section will will configure Data Export rules to be exported to the central ADX instance
// https://docs.microsoft.com/en-us/azure/templates/Microsoft.OperationalInsights/workspaces/dataExports?pivots=deployment-language-bicep
resource tcpToBlobLawExportSyslog 'Microsoft.OperationalInsights/workspaces/dataExports@2020-08-01' = {
  name: 'Export-Syslog'
  parent: aquaLawRef
  properties: {
    destination: {
      metaData: {
        eventHubName: 'syslog'
      }
      resourceId: ehNamespaceId
    }
    enable: true
    tableNames: [
      'Syslog'
    ]
  }
}

// Issue # https://github.com/Azure/azure-orbital-integration/issues/28 
// resource tcpToBlobLawExportAppTraces 'Microsoft.OperationalInsights/workspaces/dataExports@2020-08-01' = {
//   name: 'Export-AppTraces'
//   parent: aquaLawRef
//   properties: {
//     destination: {
//       metaData: {
//         eventHubName: 'apptraces'
//       }
//       resourceId: ehNamespaceId
//     }
//     enable: true
//     tableNames: [
//       'AppTraces'
//     ]
//   }
// }

// resource tcpToBlobLawExportAppExceptions 'Microsoft.OperationalInsights/workspaces/dataExports@2020-08-01' = {
//   name: 'Export-AppExceptions'
//   parent: aquaLawRef
//   properties: {
//     destination: {
//       metaData: {
//         eventHubName: 'appexceptions'
//       }
//       resourceId: ehNamespaceId
//     }
//     enable: true
//     tableNames: [
//       'AppExceptions'
//     ]
//   }
// }
