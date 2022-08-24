#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

# Source the environment file for the stage you wish to deploy.
# Use deploy/env-template.sh as a template.
# Consider putting your "env-<env-name>.sh" scripts in the ".env" directory which is ignored by git.
# e.g. `. ./.env/env-dev.sh`

set -eo pipefail

echo "Deploying pre-reqs using bicep...."
PROJECT_DIR="$(dirname -- "$0")/../.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"

./deploy/check-required-env.sh
. ./deploy/env-prereq-defaults.sh
set -euo pipefail

echo "Creating resource group: \"${AZ_RESOURCE_GROUP}\""
az group create --location "${AZ_LOCATION}" --name "${AZ_RESOURCE_GROUP}"

echo "Creating ACR resource group: \"${ACR_RESOURCE_GROUP}\""
az group create --location "${AZ_LOCATION}" --name "${ACR_RESOURCE_GROUP}"

echo "Creating storage account resource group: \"${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}\""
az group create --location "${AZ_LOCATION}" --name "${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}"

echo "Deploying bicep template"
az deployment group create --resource-group "${AZ_RESOURCE_GROUP}" \
  --name "${NAME_PREFIX}-prereq-deployment" \
  --template-file "./deploy/bicep/prereq-aks.bicep" \
  --parameters \
      namePrefix="${NAME_PREFIX}" \
      acrResourceGroup="${ACR_RESOURCE_GROUP}" \
      acrName="${ACR_NAME}" \
      storageAccountResourceGroup="${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}" \
      storageAccountName="${CONTACT_DATA_STORAGE_ACCT}"

popd
