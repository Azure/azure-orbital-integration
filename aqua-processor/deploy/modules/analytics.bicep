/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

// Please see main.bicep for param descriptions
param location string
param namePrefix string
param namePrefixStripped string

@description('The Log Analytics Workspace name for logs')
param logAnalyticsWorkspaceName string = '${namePrefix}-law'

@description('The name to use for the Application Insights instance')
param applicationInsightsName string = namePrefixStripped

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

output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output applicationInsightsRg string = resourceGroup().name
output applicationInsightsName string = applicationInsights.name
