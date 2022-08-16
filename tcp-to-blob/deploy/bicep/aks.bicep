// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

param location string = resourceGroup().location

@description('A prefix that is used to generate resources in this deployment. This must be specified.')
@maxLength(20)
param namePrefix string = uniqueString(resourceGroup().id)

@description('Name of AKS cluster.')
@maxLength(27)
param aksName string = '${uniqueString(resourceGroup().id)}aks'

@description('Resource group for ACR')
param acrResourceGroup string = resourceGroup().name

@description('Name of azure container registry')
param acrName string

// Resource group specifically for the AKS cluster. Not the same as primary resource group. The convention is how its currently defined.
@description('Name of azure kubernetes resource group')
param aksNodeResourceGroup string = 'MC_${aksName}'

param vnetName string = '${namePrefix}-vnet'

@description('A virtual network for use by the resources created in this template.')
resource rscVNET 'Microsoft.Network/virtualNetworks@2021-08-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/8'
      ]
    }
    subnets: [
      {
        name: 'vnet-subnet'
        properties:{
          addressPrefix: '10.240.0.0/16'
        }
      }
      {
        name: 'pod-subnet'
        properties: {
          addressPrefix: '10.241.0.0/16'
          delegations: [
            {
              name: 'pod-subnet-delegation'
               properties: {
                serviceName: 'Microsoft.ContainerService/managedClusters'
               }
            }
          ]
        }
      }
      { 
        name: 'orbital-subnet'
        properties: {
          addressPrefix: '10.244.0.0/16'
          delegations: [
            {
              name: 'orbital-subnet-delegation'
               properties: {
                serviceName: 'Microsoft.Orbital/orbitalGateways'
               }
            }
          ]
        } 
      }
    ]
  }
}

@description('A Log Analytics Workspace for storing metrics and other log data provided by the AKS cluster.')
resource laws 'Microsoft.OperationalInsights/workspaces@2021-12-01-preview' = {
  name: '${namePrefix}-law'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource aksControlPlaneIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2021-09-30-preview' = {
  name: '${namePrefix}-aks-control-plane-identity'
  location: location
}

@description('This is the built-in Contributor role. See https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#network-contributor')
resource networkContributorRoleDefinition 'Microsoft.Authorization/roleDefinitions@2018-01-01-preview' existing = {
  scope: subscription()
  name: 'b24988ac-6180-42a0-ab88-20f7382dd24c'
}
resource networkContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2020-04-01-preview' = {
  name: guid(resourceGroup().id, aksControlPlaneIdentity.id, networkContributorRoleDefinition.id)
  properties: {
    roleDefinitionId: networkContributorRoleDefinition.id
    principalId: aksControlPlaneIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource aksCluster 'Microsoft.ContainerService/managedClusters@2022-04-02-preview' = {
  name: aksName
  location: location
  sku: {
    name: 'Basic'
    tier: 'Paid'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${aksControlPlaneIdentity.id}': {}
    }
  }
  properties: {
    dnsPrefix:  '${namePrefix}-dns'
    agentPoolProfiles: [
      {
        name: 'agentpool'
        count: 2
        vmSize: 'Standard_DS2_v2'
        maxPods: 110
        type: 'VirtualMachineScaleSets'
        availabilityZones: [
          '1'
          '2'
          '3'
        ]
        maxCount: 5
        minCount: 1
        enableAutoScaling: true
        enableNodePublicIP: false
        mode: 'System'
        osType: 'Linux'
        enableFIPS: false
        vnetSubnetID:  resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, 'vnet-subnet')
        podSubnetID: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, 'pod-subnet')
      }
    ]
    servicePrincipalProfile: {
      clientId: 'msi'
    }
    addonProfiles: {
      azureKeyvaultSecretsProvider: {
        enabled: false
      }
      azurepolicy: {
        enabled: false
      }
      httpApplicationRouting: {
        enabled: false
      }
      omsAgent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: laws.id
        }
      }
    }
    nodeResourceGroup: aksNodeResourceGroup
    enableRBAC: true
    networkProfile: {
      networkPlugin: 'azure'
      dnsServiceIP: '10.0.40.85'
      serviceCidr: '10.0.0.0/16'
      dockerBridgeCidr: '172.17.0.1/16'
    }
  }
}

@description('Invoke a module to assign the AcrPull role to the aks cluster kubelet identity.')
module aksAcrPullRoleAssignment 'modules/grant_acr_pull.bicep' = {
  name: '${namePrefix}-acrpull-role-assignment'
  scope: resourceGroup(acrResourceGroup)
  params: {
    acrName: acrName
    aksIdentityPrincipalId: aksCluster.properties.identityProfile.kubeletIdentity.objectId
    roleGuid: guid(resourceGroup().id, aksCluster.name, acrName, 'acrpull-role-assignment')
  }
}
