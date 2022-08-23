/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

// Please see main.bicep for param descriptions
param location string
param namePrefix string
param allowedSshIpAddress string
param adminPublicKey string
param storageAccountName string
param storageAccountBlobEndpoint string
param storageAccountSasToken string
param logAnalyticsWorkspaceId string

@description('Name of the VM')
param vmName string = '${namePrefix}-vm'

@description('Admin user name')
param adminUsername string = 'azureuser'

@description('Specify the disk size for the vm')
param vmDiskSize int = 1023

@description('VM size')
param vmSize string = 'Standard_D16ads_v5'

param networkInterfaceName string = '${vmName}-nic'

@description('Name of the subnet')
param subnetName string = '${vmName}-sub'

@description('Name of the vnet')
param vnetName string = '${vmName}-vnet'

@description('Name of the vnet')
param publicIPAddressName string = '${vmName}-pip'

@description('Name of the network security group')
param networkSecurityGroupName string = '${vmName}-nsg'

@description('The name of the data collection rule association')
param dcraName string = '${namePrefix}-dcra'

@description('Name of the data collection rule')
param dcrName string = '${namePrefix}-dcr'

@description('Name of the data collection endpoint')
param dceName string = '${namePrefix}-dce'

var subnetRef = '${vnet.id}/subnets/${subnetName}'

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.insights/components?pivots=deployment-language-bicep')
resource nsg 'Microsoft.Network/networkSecurityGroups@2021-05-01' = {
  name: networkSecurityGroupName
  location: location
  properties: {
    securityRules: [
      {
        name: 'SSH'
        properties: {
          priority: 300
          protocol: 'TCP'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: allowedSshIpAddress
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
        }
      }
    ]
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.network/virtualnetworks?pivots=deployment-language-bicep')
resource vnet 'Microsoft.Network/virtualNetworks@2021-05-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.1.0.0/16'
      ]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: '10.1.0.0/24'
        }
      }
    ]
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.network/publicipaddresses?pivots=deployment-language-bicep')
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
      domainNameLabel: vmName
    }
    idleTimeoutInMinutes: 4
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.network/networkinterfaces?pivots=deployment-language-bicep')
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
      id: nsg.id
    }
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.compute/virtualmachines?pivots=deployment-language-bicep')
resource aquaProcessorVm 'Microsoft.Compute/virtualMachines@2021-07-01' = {
  name: vmName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
        deleteOption: 'Delete'
        diskSizeGB: vmDiskSize
      }
      imageReference: {
        publisher: 'OpenLogic'
        offer: 'CentOS'
        sku: '7_9-gen2'
        version: 'latest'
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
          properties: {
            deleteOption: 'Delete'
          }
        }
      ]
    }

    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      customData: loadFileAsBase64('../cloud-init.yaml')
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
        storageUri: storageAccountBlobEndpoint
      }
    }
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.compute/virtualmachines/extensions?pivots=deployment-language-bicep')
resource vm_agent 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  name: 'AzureMonitorLinuxAgent-${vmName}'
  parent: aquaProcessorVm
  location: location
  properties: {
    publisher: 'Microsoft.Azure.Monitor'
    type: 'AzureMonitorLinuxAgent'
    typeHandlerVersion: '1.5'
    autoUpgradeMinorVersion: true
    enableAutomaticUpgrade: true
  }
}

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.compute/virtualmachines/extensions?pivots=deployment-language-bicep')
resource vmSettings 'Microsoft.Compute/virtualMachines/extensions@2021-11-01' = {
  parent: aquaProcessorVm
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
          file: '/var/log/ipoppLogs'
          table: 'ipoppLogs'
          sinks: 'MyFilelogJsonBlob'
        }
        {
          file: '/var/log/rtstpsLogs'
          table: 'rtstpsLogs'
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
      storageAccountName: storageAccountName
      storageAccountEndpoint: storageAccountBlobEndpoint
      storageAccountSasToken: storageAccountSasToken
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
          workspaceResourceId: logAnalyticsWorkspaceId
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

@description('https://docs.microsoft.com/en-us/azure/templates/microsoft.insights/datacollectionruleassociations?pivots=deployment-language-bicep')
resource dcra 'Microsoft.Insights/dataCollectionRuleAssociations@2019-11-01-preview' = {
  name: dcraName
  scope: aquaProcessorVm
  properties: {
    dataCollectionRuleId: dataCollectionRule.id
    description: 'Associating log analytics data collection rule to the Aqua Processor VM'
  }
}

resource symbolicname 'Microsoft.Compute/virtualMachines/runCommands@2022-03-01' = {
  name: 'blob-download-service'
  location: location
  parent: aquaProcessorVm
  properties: {
    asyncExecution: false
    source: {
      script: 'curl "${storageAccountBlobEndpoint}artifacts/artifacts.tar.gz?${storageAccountSasToken}" -o artifacts.tar.gz && mkdir -p artifacts && tar -zvxf ./artifacts.tar.gz -C artifacts && ./artifacts/install.sh'
    }
    timeoutInSeconds: 600
  }
}

output aquaProcessorVmName string = aquaProcessorVm.name
