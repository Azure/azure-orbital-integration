// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

// Please see main.bicep for param descriptions
param location string
param uamiId string
param adxClusterName string

@description('The resource id of the apptraces Event Hub')
param ehAppTracesId string

@description('The resource id of the appexceptions Event Hub')
param ehAppExceptionsId string

@description('The resource id of the containerlog Event Hub')
param ehContainerLogId string

@description('The resource id of the syslog Event Hub')
param ehSyslogId string

@description('The script files for tables, update policies and expands where the central logs get stored')
var databaseConfigs = [
  {
    name: 'AppTraces'
    value: loadTextContent('../ADX/Tables/AppTraces.kql')
  }
  {
    name: 'AppExceptions'
    value: loadTextContent('../ADX/Tables/AppExceptions.kql')
  }
  {
    name: 'ContainerLog'
    value: loadTextContent('../ADX/Tables/ContainerLog.kql')
  }
  {
    name: 'Syslog'
    value: loadTextContent('../ADX/Tables/Syslog.kql')
  }
]

@description('The Data Connection configurations to apply that accept exported logs from Event Hub')
var dataConnectionConfigs = [
  {
    name: 'AppTraces'
    mappingRule: 'AppTraces_Staging_Mapping'
    tableName: 'Staging_AppTraces'
    ehResourceId: ehAppTracesId
  }
  {
    name: 'AppExceptions'
    mappingRule: 'AppExceptions_Staging_Mapping'
    tableName: 'Staging_AppExceptions'
    ehResourceId: ehAppExceptionsId
  }
  {
    name: 'ContainerLog'
    mappingRule: 'ContainerLog_Staging_Mapping'
    tableName: 'Staging_ContainerLog'
    ehResourceId: ehContainerLogId
  }
  {
    name: 'Syslog'
    mappingRule: 'Syslog_Staging_Mapping'
    tableName: 'Staging_Syslog'
    ehResourceId: ehSyslogId
  }
]

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.kusto/clusters?pivots=deployment-language-bicep')
resource aoiKustoCentralLoggingCluster 'Microsoft.Kusto/clusters@2022-02-01' = {
  name: adxClusterName
  location: location
  sku: {
    capacity: 2
    name: 'Standard_E8a_v4'
    tier: 'standard'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uamiId}': {}
    }
  }
  properties: {
    optimizedAutoscale: {
      isEnabled: false
      maximum: 2
      minimum: 2
      version: 1
    }
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.kusto/clusters/databases?pivots=deployment-language-bicep')
resource aoiKustoCentralLoggingClusterDatabase 'Microsoft.Kusto/clusters/databases@2022-02-01' = {
  name: 'AOICentralLogging'
  location: location
  parent: aoiKustoCentralLoggingCluster
  kind: 'ReadWrite'
  properties: {
    hotCachePeriod: 'P30D'
    softDeletePeriod: 'P1D'
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.kusto/clusters/databases/scripts?pivots=deployment-language-bicep')
@batchSize(1)
resource aoiKustoCentralLoggingDatabaseConfig 'Microsoft.Kusto/clusters/databases/scripts@2022-02-01' = [for databaseConfig in databaseConfigs: {
  name: '${databaseConfig.name}-config'
  parent: aoiKustoCentralLoggingClusterDatabase
  properties: {
    continueOnErrors: true
    forceUpdateTag: 'v2.2'
    scriptContent: databaseConfig.value
  }
}]

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.kusto/clusters/databases/dataconnections?pivots=deployment-language-bicep')
resource aoiKustoDataConnectionAppTraces 'Microsoft.Kusto/clusters/databases/dataConnections@2022-02-01' = [for dataConnectionConfig in dataConnectionConfigs: {
  name: dataConnectionConfig.name
  location: location
  parent: aoiKustoCentralLoggingClusterDatabase
  kind: 'EventHub'
  properties: {
    compression: 'none'
    consumerGroup: 'kusto'
    dataFormat: 'MULTIJSON'
    eventHubResourceId: dataConnectionConfig.ehResourceId
    managedIdentityResourceId: uamiId
    mappingRuleName: dataConnectionConfig.mappingRule
    tableName: dataConnectionConfig.tableName
  }
  dependsOn: [
    aoiKustoCentralLoggingDatabaseConfig
  ]
}]
