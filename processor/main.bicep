/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/
@description('Location or region for the virtual machine and other resources being created')
param location string = resourceGroup().location

@description('Rules for the network security group')
param networkSecurityGroupRules array

@description('Name of the subnet in the virtual network')
param subnetName string

@description('Name of the VM')
param virtualMachineName string

@description('Os disk type for VM')
param osDiskType string

@description('Delete option for VM os disk')
param osDiskDeleteOption string

@description('VM size')
param virtualMachineSize string

@description('Specify what happens to the network interface when the VM using it is deleted.')
param networkInterfaceDeleteOption string

@description('Admin user name')
param adminUsername string

@description('Specify the disk size for the vm')
param vmDiskSize int

@description('Image reference for the storage profile')
param imageReference object

@description('run: cat ~/.ssh/id_rsa.pub | pbcopy and paste the result')
@secure()
param adminPublicKey string

@description('Virtual network name')
param vnetName string = 'vnet-${uniqueString(resourceGroup().id, deployment().name)}'

@description('Unique DNS Name for the Public IP used to access the Virtual Machine.')
param DNSLabelPrefix string = toLower('dns-${virtualMachineName}-${uniqueString(resourceGroup().id, deployment().name)}')

@description('Name for the log analytics workspace')
param logAnalyticsWorkspaceName string = 'log-${uniqueString(resourceGroup().id, deployment().name)}'

@description('Specifies the name of the Azure Storage account.')
param storageAccountName string = 'stvm${uniqueString(resourceGroup().id, deployment().name)}'

@description('Specifies the name of the blob container.')
param containerName string = 'logs'

@description('Name of the data collection rule')
param dcrName string = 'dcr-${uniqueString(resourceGroup().id, deployment().name)}'

@description('Expiration time of the key')
param keyExpiration string = dateTimeFromEpoch(dateTimeToEpoch(dateTimeAdd(utcNow(), 'P1Y')))

param networkSecurityGroupName string = 'nsg-${uniqueString(resourceGroup().id, deployment().name)}'

@description('File path and table name for the system logs')
param ipoppSyslog object

@description('File path and table name for the system logs')
param rtstpsSyslog object

var publicIPAddressName = '${virtualMachineName}PublicIP'
var networkInterfaceName = '${virtualMachineName}NetInt'
var subnetRef = '${vnetModule.outputs.vnetId}/subnets/${subnetName}'
var subnetAddressPrefix = '10.1.0.0/24'
var addressPrefix = '10.1.0.0/16'

module vnetModule 'modules/virtualNetwork.bicep' = {
  name: 'vnetDeployment'
  params: {
    location: location
    networkSecurityGroupRules: networkSecurityGroupRules
    subnetName: subnetName
    vnetName: vnetName
    networkSecurityGroupName: networkSecurityGroupName
    subnetAddressPrefix: subnetAddressPrefix
    addressPrefix: addressPrefix
  }
}

module storageAccountModule 'modules/storageAccount.bicep' = {
  name: 'storageAccountDeployment'
  params: {
    location: location
    storageAccountName: storageAccountName
    containerName: containerName
    keyExpiration: keyExpiration
  }
}

module analyticsModule 'modules/analytics.bicep' = {
  name: 'analyticsDeployment'
  params: {
    location: location
    dcrName: dcrName
    logAnalyticsWorkspaceName: logAnalyticsWorkspaceName
  }
}

resource pip 'Microsoft.Network/publicIPAddresses@2021-05-01' = {
  name: publicIPAddressName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    publicIPAllocationMethod: 'Dynamic'
    publicIPAddressVersion: 'IPv4'
    dnsSettings: {
      domainNameLabel: DNSLabelPrefix
    }
    idleTimeoutInMinutes: 4
  }
}


resource nic 'Microsoft.Network/networkInterfaces@2021-05-01' = {
  name: networkInterfaceName
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          subnet: {
            id: subnetRef
          }
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: {
            id: pip.id
          }
        }
      }
    ]
    networkSecurityGroup: {
      id: vnetModule.outputs.nsgId
    }
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2021-07-01' = {
  name: virtualMachineName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    hardwareProfile: {
      vmSize: virtualMachineSize
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: osDiskType
        }
        deleteOption: osDiskDeleteOption
        diskSizeGB: vmDiskSize
      }
      imageReference: imageReference
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
          properties: {
            deleteOption: networkInterfaceDeleteOption
          }
        }
      ]
    }
    
    osProfile: {
      computerName: virtualMachineName
      adminUsername: adminUsername
      customData: loadFileAsBase64('cloud-init.yaml')
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: adminPublicKey
            }
          ]
        }
      }
    }
    diagnosticsProfile: {
      bootDiagnostics: {
        enabled: true
        storageUri: storageAccountModule.outputs.saBlob
      }
    }
  }
}

resource vm_agent 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  name: 'AzureMonitorLinuxAgent-${virtualMachineName}'
  parent: vm
  location: location
  properties: {
    publisher: 'Microsoft.Azure.Monitor'
    type: 'AzureMonitorLinuxAgent'
    typeHandlerVersion: '1.5'
    autoUpgradeMinorVersion: true
    enableAutomaticUpgrade: true
  }
}

resource dcra 'Microsoft.Insights/dataCollectionRuleAssociations@2019-11-01-preview' = {
  name: 'string'
  scope: vm
  properties: {
    dataCollectionRuleId: analyticsModule.outputs.dcrId
    description: 'Asociating log analytics data collection rule to the VM'
  }
}

resource vm_settings 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  parent: vm
  name: 'Microsoft.Insights.VMDiagnosticsSettings'
  location: location
  properties: {
    publisher: 'Microsoft.Azure.Diagnostics'
    type: 'LinuxDiagnostic'
    typeHandlerVersion: '4.0'
    autoUpgradeMinorVersion: true
    settings: {
      StorageAccount: storageAccountName
      ladCfg: {
        sampleRateInSeconds: 15
        diagnosticMonitorConfiguration: {
          eventVolume: 'Large'
          syslogEvents: {
            sinks: 'localLogsSink'
            syslogEventConfiguration: {
              LOG_LOCAL0: 'LOG_DEBUG'
              LOG_LOCAL1: 'LOG_DEBUG'
              LOG_LOCAL2: 'LOG_DEBUG'
            }
          }
        }
      }
      fileLogs: [
        {
          file: ipoppSyslog.file
          table: ipoppSyslog.table
          sinks: 'MyFilelogJsonBlob'
        }
        {
          file: rtstpsSyslog.file
          table: rtstpsSyslog.table
          sinks: 'MyFilelogJsonBlob'
        }
        {
          file: '/var/log/cloud-init.log'
          table: 'cloudInitLogs'
          sinks: 'cloudInitSink'
        }
      ]
    }
    protectedSettings: {
      storageAccountName: storageAccountModule.outputs.saName
      storageAccountEndPoint: storageAccountModule.outputs.saBlob
      storageAccountSasToken: storageAccountModule.outputs.token
      sinksConfig: {
        sink: [
          {
            name: 'MyFilelogJsonBlob'
            type: 'JsonBlob'
          }
          {
            name: 'localLogsSink'
            type: 'JsonBlob'
          }
          {
            name: 'cloudInitSink'
            type: 'JsonBlob'
          }
        ]
      }
    }
  }
}

output adminUsername string = adminUsername
