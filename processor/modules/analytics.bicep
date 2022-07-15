/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

@description('Location or region for the virtual machine and other resources being created')
param location string

param logAnalyticsWorkspaceName string

@description('Name of the data collection rule')
param dcrName string

resource log 'Microsoft.OperationalInsights/workspaces@2020-03-01-preview' = {
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

resource dce 'Microsoft.Insights/dataCollectionEndpoints@2021-09-01-preview' = {
  name: 'dataCollectionEndpoint'
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

resource dcr 'Microsoft.Insights/dataCollectionRules@2021-09-01-preview' = {
  name: dcrName
  location: location
  kind: 'Linux'
  properties: {
    dataCollectionEndpointId: dce.id
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
          workspaceResourceId: log.id
          name: 'la-data-destination'
        }
      ]
      azureMonitorMetrics:{
        name: 'ipopp-monitor'
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


output dcrId string = dcr.id
