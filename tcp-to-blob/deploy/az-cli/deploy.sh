#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

# Source the environment file for the stage you wish to deploy.
# Use deploy/env-template.sh as a template.
# Consider putting your "env-<env-name>.sh" scripts in the ".env" directory which is ignored by git.
# e.g. `. ./.env/env-dev.sh`

###############################################################
# Note: This script is for demonstration purposes only.       #
# We recommend using `deploy/bicep/deploy.sh` for deployment. #
###############################################################

set -eo pipefail

PROJECT_DIR="$(dirname -- "$0")/../.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"

./deploy/check-required-env.sh
. ./deploy/env-prereq-defaults.sh

# Create resource group if needed
if [[ $(az group exists -n "${AZ_RESOURCE_GROUP}") -eq 'false' ]];
then
  echo "Creating resource group: \"${AZ_RESOURCE_GROUP}\""
  az group create --location "${AZ_LOCATION}" --name "${AZ_RESOURCE_GROUP}"
fi

# Create ACR resource group if needed
if  [[ $(az group exists -n "${ACR_RESOURCE_GROUP}") -eq 'false' ]];
then
  echo "Creating resource group: \"${ACR_RESOURCE_GROUP}\""
  az group create --location "${AZ_LOCATION}" --name "${ACR_RESOURCE_GROUP}"
fi

# Create ACR if needed
if [[ -z $(az acr check-name -n "${ACR_NAME}" | grep "already in use") ]];
then
    echo "ACR doesn't exist. Creating ACR: \"${ACR_NAME}\""
    az acr create --name "${ACR_NAME}" --resource-group "${ACR_RESOURCE_GROUP}" --sku "Standard"
else
  echo "ACR \"${ACR_NAME}\"" exists.
fi

# Create storage account resource group if needed
if  [[ $(az group exists -n "${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}") -eq 'false' ]];
then
  echo "Creating resource group: \"${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}\""
  az group create --location "${AZ_LOCATION}" --name "${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}"
fi

# Create storage account if needed
if [[ -z $(az storage account list -g "${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}"  --query "[?name=='${CONTACT_DATA_STORAGE_ACCT}'].{name:name,location:location} | [? contains(location,'${AZ_LOCATION}')]" --output table) ]]
then
    echo "Storage account doesn't exist. Creating : \"${CONTACT_DATA_STORAGE_ACCT}\""
    az storage account create --name "${CONTACT_DATA_STORAGE_ACCT}" --resource-group "${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}"
else
    echo "Storage account \"${CONTACT_DATA_STORAGE_ACCT}\" exists."
fi

# Create Log Analytics Workspace if needed
if [[ -z $(az monitor log-analytics workspace list -g "${AZ_RESOURCE_GROUP}" --query "[?name=='${LOG_ANALYTICS_WORKSPACE_NAME}']" --query "[0].id" -otsv) ]]
then
    echo "Log Analytics Workspace doesn't exist. Creating : \"${LOG_ANALYTICS_WORKSPACE_NAME}\""
    LOG_ANALYTICS_WORKSPACE_ID=$(az monitor log-analytics workspace create -g "${AZ_RESOURCE_GROUP}" -n "${LOG_ANALYTICS_WORKSPACE_NAME}" --query "id" -otsv)
else
    echo "Log Analytics Workspace \"${LOG_ANALYTICS_WORKSPACE_NAME}\" exists."
    LOG_ANALYTICS_WORKSPACE_ID=$(az monitor log-analytics workspace list -g "${AZ_RESOURCE_GROUP}" --query "[?name=='${LOG_ANALYTICS_WORKSPACE_NAME}']" --query "[0].id" -otsv)
fi

. ./deploy/env-defaults.sh
set -euo pipefail

# Create vnet
echo "Creating AKS_VNET: \"${AKS_VNET}\" with prefix: \"${AKS_VNET_ADDR_PREFIX}\""
az network vnet create -g "${AZ_RESOURCE_GROUP}" --name "${AKS_VNET}" --address-prefixes "${AKS_VNET_ADDR_PREFIX}" -o none

# Create subnets
echo "Creating \"vnet-subnet\". AKS_VNET_SUBNET_ADDR_PREFIX: \"$AKS_VNET_SUBNET_ADDR_PREFIX\""
az network vnet subnet create -g "${AZ_RESOURCE_GROUP}" --vnet-name "${AKS_VNET}" \
  --name vnet-subnet --address-prefixes "${AKS_VNET_SUBNET_ADDR_PREFIX}" -o none

echo "Creating \"pod-subnet\". AKS_POD_SUBNET_ADDR_PREFIX: \"$AKS_POD_SUBNET_ADDR_PREFIX\""
az network vnet subnet create -g "${AZ_RESOURCE_GROUP}" --vnet-name "${AKS_VNET}" \
  --name pod-subnet --address-prefixes "${AKS_POD_SUBNET_ADDR_PREFIX}" -o none

echo "Creating \"orbital-subnet\". AKS_ORBITAL_SUBNET_ADDR_PREFIX: \"$AKS_ORBITAL_SUBNET_ADDR_PREFIX\""
az network vnet subnet create -g "${AZ_RESOURCE_GROUP}" --vnet-name "${AKS_VNET}" \
  --name orbital-subnet --address-prefixes "${AKS_ORBITAL_SUBNET_ADDR_PREFIX}" -o none \
  --delegations "Microsoft.Orbital/orbitalGateways"

KUBELET_IDENTITY_NAME="${NAME_PREFIX}-kubelet-identity"
echo "Creating managed identity: \"${KUBELET_IDENTITY_NAME}\""
KUBELET_IDENTITY_ID=$(az identity create -g "${AZ_RESOURCE_GROUP}" -n "${KUBELET_IDENTITY_NAME}" --query id --out tsv)
echo "KUBELET_IDENTITY_ID = \"${KUBELET_IDENTITY_ID}\""

AKS_CONTROL_PLANE_IDENTITY_NAME="${NAME_PREFIX}-aks-control-plane-identity"
echo "Creating managed identity: \"${AKS_CONTROL_PLANE_IDENTITY_NAME}\""
AKS_CONTROL_PLANE_IDENTITY_ID=$(az identity create -g "${AZ_RESOURCE_GROUP}" -n "${AKS_CONTROL_PLANE_IDENTITY_NAME}" --query id --out tsv)
echo "AKS_CONTROL_PLANE_IDENTITY_ID = \"${AKS_CONTROL_PLANE_IDENTITY_ID}\""


SLEEP_SECONDS=60;# TODO: Experiment with wait that works best or better way to run upon identity initialization.
echo "Sleeping ${SLEEP_SECONDS} seconds for identity/role propagation..."
sleep ${SLEEP_SECONDS};

echo "Assigning control plane identity Network Contributor role."
AKS_CONTROL_PLANE_SP_ID=$(az identity show --name "${AKS_CONTROL_PLANE_IDENTITY_NAME}" -g "${AZ_RESOURCE_GROUP}"  --query principalId --out tsv)
az role assignment create --assignee "${AKS_CONTROL_PLANE_SP_ID}" --role 'Network Contributor' --scope "/subscriptions/${AZ_SUBSCRIPTION}/resourceGroups/${AZ_RESOURCE_GROUP}/providers/Microsoft.Network/virtualNetworks/${AKS_VNET}"

echo "Creating AKS cluster: \"${AKS_NAME}\""
az aks create -n "${AKS_NAME}" -g "${AZ_RESOURCE_GROUP}"  \
  --enable-addons monitoring \
  --assign-identity "${AKS_CONTROL_PLANE_IDENTITY_ID}" \
  --assign-kubelet-identity "${KUBELET_IDENTITY_ID}" \
  --workspace-resource-id "${LOG_ANALYTICS_WORKSPACE_ID}" \
  --max-pods 250 \
  --node-count 2 \
  --network-plugin "azure" \
  --vnet-subnet-id "${AKS_VNET_ID}/subnets/vnet-subnet" \
  --pod-subnet-id "${AKS_VNET_ID}/subnets/pod-subnet" \
  --attach-acr "${ACR_NAME}"

./deploy/az-cli/deploy-service-and-dashboards.sh

popd