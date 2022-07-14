/*
Copyright (c) 2022 Microsoft Corporation. All rights reserved.
Software is licensed under the MIT License. See LICENSE in the project
root for license information.
*/

param subnetName string
param vnetName string
param networkSecurityGroupName string

@description('Prefix of subnet IP address')
param subnetAddressPrefix string

@description('Prefix for virtual network IP address')
param addressPrefix string

@description('Location or region for the virtual machine and other resources being created')
param location string

@description('Rules for the network security group')
param networkSecurityGroupRules array


resource nsg 'Microsoft.Network/networkSecurityGroups@2021-05-01' = {
  name: networkSecurityGroupName
  location: location
  properties: {
    securityRules: networkSecurityGroupRules
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2021-05-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        addressPrefix
      ]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: subnetAddressPrefix
        }
      }
    ]
  }
}

output nsgId string = nsg.id
output vnetId string = vnet.id
