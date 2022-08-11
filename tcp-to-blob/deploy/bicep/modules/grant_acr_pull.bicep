@description('The ACR on which to assign the AcrPull role.')
param acrName string
@description('The principal ID of the identity to give the AcrPull role on acrName.')
param aksIdentityPrincipalId string
@description('A GUID identifying the role assignment.')
param roleGuid string

@description('The storage account on which to assign the AcrPull role to aksIdentityPrincipalId.')
resource acr 'Microsoft.ContainerRegistry/registries@2021-12-01-preview' existing = {
  name: acrName
}

@description('This is the built-in AcrPull role. See https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#acrpull')
resource acrPullRoleDefinition 'Microsoft.Authorization/roleDefinitions@2018-01-01-preview' existing = {
  scope: subscription()
  name: '7f951dda-4ed3-4680-a7ca-43fe172d538d'
}

@description('Assigns the AcrPull role to aksIdentityPrincipalId on acrName.')
resource readerRoleAssignment 'Microsoft.Authorization/roleAssignments@2020-10-01-preview' = {
  name: roleGuid
  scope: acr
  properties: {
    principalId: aksIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleDefinition.id
  }
}
