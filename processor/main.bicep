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

@description('Name of the VM for ipopp')
param ipoppVirtualMachineName string

@description('Name of the VM for rtstps')
param rtstpsVirtualMachineName string

@description('Os disk type for the ipopp VM')
param ipoppOsDiskType string

@description('Os disk type for the rtstps VM')
param rtstpsOsDiskType string

@description('Delete option for VM os disk')
param osDiskDeleteOption string

@description('VM size for ipopp')
param ipoppVirtualMachineSize string

@description('VM size for rtstps')
param rtstpsVirtualMachineSize string

@description('Specify what happens to the network interface when the VM using it is deleted.')
param networkInterfaceDeleteOption string

@description('Admin user name')
param adminUsername string

@description('Specify the disk size for the ipopp vm')
param ipoppVmDiskSize int

@description('Specify the disk size of the rtstps vm')
param rtstpsVmDiskSize int

@description('Image reference for the storage profile')
param imageReference object

@description('run: cat ~/.ssh/id_rsa.pub | pbcopy and paste the result')
@secure()
param adminPublicKey string

@description('Virtual network name')
param vnetName string = 'vnet-${uniqueString(resourceGroup().id, deployment().name)}'

@description('Unique DNS Name for the Public IP used to access the Virtual Machine.')
param ipoppDNSLabelPrefix string = toLower('dns-${ipoppVirtualMachineName}-${uniqueString(resourceGroup().id, deployment().name)}')

@description('Unique DNS Name for the Public IP used to access the Virtual Machine.')
param rtstpsDNSLabelPrefix string = toLower('dns-${rtstpsVirtualMachineName}-${uniqueString(resourceGroup().id, deployment().name)}')

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

@description('If true, IPOPP will be installed on the VM.')
param needsIpoppInstallation bool

@description('Details about the source of IPOPP installation files')
param ipoppSourceDetails object

@description('File path and table name for the system logs')
param ipoppSyslog object

@description('File path and table name for the system logs')
param rtstpsSyslog object

var ipoppPublicIPAddressName = '${ipoppVirtualMachineName}PublicIP'
var rtstpsPublicIPAddressName = '${rtstpsVirtualMachineName}PublicIP'
var ipoppNetworkInterfaceName = '${ipoppVirtualMachineName}NetInt'
var rtstpsNetworkInterfaceName = '${rtstpsVirtualMachineName}NetInt'
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

resource pip_ipopp 'Microsoft.Network/publicIPAddresses@2021-05-01' = {
  name: ipoppPublicIPAddressName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    publicIPAllocationMethod: 'Dynamic'
    publicIPAddressVersion: 'IPv4'
    dnsSettings: {
      domainNameLabel: ipoppDNSLabelPrefix
    }
    idleTimeoutInMinutes: 4
  }
}

resource pip_rtstps 'Microsoft.Network/publicIPAddresses@2021-05-01' = {
  name: rtstpsPublicIPAddressName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    publicIPAllocationMethod: 'Dynamic'
    publicIPAddressVersion: 'IPv4'
    dnsSettings: {
      domainNameLabel: rtstpsDNSLabelPrefix
    }
    idleTimeoutInMinutes: 4
  }
}

resource nic_ipopp 'Microsoft.Network/networkInterfaces@2021-05-01' = {
  name: ipoppNetworkInterfaceName
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
            id: pip_ipopp.id
          }
        }
      }
    ]
    networkSecurityGroup: {
      id: vnetModule.outputs.nsgId
    }
  }
}

resource nic_rtstps 'Microsoft.Network/networkInterfaces@2021-05-01' = {
  name: rtstpsNetworkInterfaceName
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
            id: pip_rtstps.id
          }
        }
      }
    ]
    networkSecurityGroup: {
      id: vnetModule.outputs.nsgId
    }
  }
}

resource id 'Microsoft.ManagedIdentity/userAssignedIdentities@2021-09-30-preview' = if (needsIpoppInstallation){
  name: ipoppSourceDetails.managedIdentityName
  location: location
  //scope: resourceGroup(ipoppSourceDetails.resourceGroupName)
}

resource vm_ipopp 'Microsoft.Compute/virtualMachines@2021-07-01' = {
  name: ipoppVirtualMachineName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${id.id}': {}
    }
  }
  properties: {
    hardwareProfile: {
      vmSize: ipoppVirtualMachineSize
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: ipoppOsDiskType
        }
        deleteOption: osDiskDeleteOption
        diskSizeGB: ipoppVmDiskSize
      }
      imageReference: imageReference
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic_ipopp.id
          properties: {
            deleteOption: networkInterfaceDeleteOption
          }
        }
      ]
    }
    
    osProfile: {
      computerName: ipoppVirtualMachineName
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

resource vm_rtstps 'Microsoft.Compute/virtualMachines@2021-07-01' = {
  name: rtstpsVirtualMachineName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${id.id}': {}
    }
  }
  properties: {
    hardwareProfile: {
      vmSize: rtstpsVirtualMachineSize
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: rtstpsOsDiskType
        }
        deleteOption: osDiskDeleteOption
        diskSizeGB: rtstpsVmDiskSize
      }
      imageReference: imageReference
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic_rtstps.id
          properties: {
            deleteOption: networkInterfaceDeleteOption
          }
        }
      ]
    }
    
    osProfile: {
      computerName: rtstpsVirtualMachineName
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

resource vm_agent_ipopp 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  name: 'AzureMonitorLinuxAgent-${ipoppVirtualMachineName}'
  parent: vm_ipopp
  location: location
  properties: {
    publisher: 'Microsoft.Azure.Monitor'
    type: 'AzureMonitorLinuxAgent'
    typeHandlerVersion: '1.5'
    autoUpgradeMinorVersion: true
    enableAutomaticUpgrade: true
  }
}

resource vm_agent_rtstps 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  name: 'AzureMonitorLinuxAgent-${rtstpsVirtualMachineName}'
  parent: vm_rtstps
  location: location
  properties: {
    publisher: 'Microsoft.Azure.Monitor'
    type: 'AzureMonitorLinuxAgent'
    typeHandlerVersion: '1.5'
    autoUpgradeMinorVersion: true
    enableAutomaticUpgrade: true
  }
}

resource dcra_ipopp 'Microsoft.Insights/dataCollectionRuleAssociations@2019-11-01-preview' = {
  name: 'string'
  scope: vm_ipopp
  properties: {
    dataCollectionRuleId: analyticsModule.outputs.dcrId
    description: 'Asociating log analytics data collection rule to the VM'
  }
}

resource dcra_rtstps 'Microsoft.Insights/dataCollectionRuleAssociations@2019-11-01-preview' = {
  name: 'string'
  scope: vm_rtstps
  properties: {
    dataCollectionRuleId: analyticsModule.outputs.dcrId
    description: 'Asociating log analytics data collection rule to the VM'
  }
}

resource vm_settings_ipopp 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  parent: vm_ipopp
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

resource vm_settings_rtstps 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  parent: vm_rtstps
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
      storageAccountEndPoint: storageAccountModule.outputs.saName
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
//output vmIP string = publicIP.properties.dnsSettings.fqdn
