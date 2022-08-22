/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

// Please see main.bicep for param descriptions
param location string
param namePrefix string
param namePrefixStripped string
param aquaProcessorVmName string

@description('Name of the data collection rule')
param dcrName string = '${namePrefix}-dcr'

@description('Name of the data collection endpoint')
param dceName string = '${namePrefix}-dce'

@description('The Log Analytics Workspace name for logs')
param logAnalyticsWorkspaceName string = '${namePrefix}-law'

@description('The name to use for the Application Insights instance')
param applicationInsightsName string = namePrefixStripped

@description('The name of the data collection rule association')
param dcraName string = '${namePrefix}-dcra'

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/workspaces?pivots=deployment-language-bicep')
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2020-03-01-preview' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: any({
    retentionInDays: 30
    features: {
      searchVersion: 1
    }
    sku: {
      name: 'PerGB2018'
    }
  })
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.insights/datacollectionendpoints?pivots=deployment-language-bicep')
resource dataCollectionEndpoint 'Microsoft.Insights/dataCollectionEndpoints@2021-09-01-preview' = {
  name: dceName
  location: location
  kind: 'Linux'
  properties: {
    configurationAccess: {}
    description: 'Data collection endpoint to get file based logs from the VM'
    immutableId: uniqueString(resourceGroup().id, deployment().name)
    logsIngestion: {}
    networkAcls: {
      publicNetworkAccess: 'Disabled'
    }
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.insights/datacollectionrules?pivots=deployment-language-bicep')
resource dataCollectionRule 'Microsoft.Insights/dataCollectionRules@2021-09-01-preview' = {
  name: dcrName
  location: location
  kind: 'Linux'
  properties: {
    dataCollectionEndpointId: dataCollectionEndpoint.id
    dataSources: {
      syslog: [
        {
          streams: [
            'Microsoft-Syslog'
          ]
          facilityNames: [
            'auth'
            'authpriv'
            'cron'
            'daemon'
            'mark'
            'kern'
            'local0'
            'local1'
            'local2'
            'local3'
            'local4'
            'local5'
            'local6'
            'local7'
            'lpr'
            'mail'
            'news'
            'syslog'
            'user'
            'uucp'
          ]
          logLevels: [
            'Debug'
            'Info'
            'Notice'
            'Warning'
            'Error'
            'Critical'
            'Alert'
            'Emergency'
          ]
          name: 'sysLogsDataSource'
        }
      ]
    }
    destinations: {
      logAnalytics: [
        {
          workspaceResourceId: logAnalyticsWorkspace.id
          name: 'la-data-destination'
        }
      ]
      azureMonitorMetrics: {
        name: 'aqua-processor-monitor'
      }
    }
    dataFlows: [
      {
        streams: [
          'Microsoft-Syslog'
        ]
        destinations: [
          'la-data-destination'
        ]
      }
    ]
  }
}

@description('https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/existing-resource')
resource aquaProcessorVmRef 'Microsoft.Compute/virtualMachines@2021-07-01' existing = {
  name: aquaProcessorVmName
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.insights/datacollectionruleassociations?pivots=deployment-language-bicep')
resource dcra 'Microsoft.Insights/dataCollectionRuleAssociations@2019-11-01-preview' = {
  name: dcraName
  scope: aquaProcessorVmRef
  properties: {
    dataCollectionRuleId: dataCollectionRule.id
    description: 'Associating log analytics data collection rule to the Aqua Processor VM'
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.insights/components?pivots=deployment-language-bicep')
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'other'
  properties: {
    Application_Type: 'other'
    Flow_Type: 'Bluefield'
    Request_Source: 'rest'
    RetentionInDays: 30
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}
