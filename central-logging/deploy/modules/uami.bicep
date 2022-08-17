// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

// Please see main.bicep for param descriptions
param location string
param uamiName string

@description('https://docs.microsoft.com/en-us/azure/templates/Microsoft.ManagedIdentity/userAssignedIdentities?pivots=deployment-language-bicep')
resource aoiLoggingUAMI 'Microsoft.ManagedIdentity/userAssignedIdentities@2022-01-31-preview' = {
  name: uamiName
  location: location
}

output uamiId string = aoiLoggingUAMI.id
output uamiPrincipalId string = aoiLoggingUAMI.properties.principalId
