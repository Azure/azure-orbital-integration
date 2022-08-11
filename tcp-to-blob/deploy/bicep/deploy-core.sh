#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

# Source the environment file for the stage you wish to deploy.
# Use deploy/env-sample.sh as a template.
# Consider putting your "env-<env-name>.sh" scripts in the ".env" directory which is ignored by git.
# e.g. `. ./.env/env-dev.sh`

set -eo pipefail

echo "Deploying core using bicep...."
PROJECT_DIR="$(dirname -- "$0")/../.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"

./deploy/check-required-env.sh
. ./deploy/env-defaults.sh
set -euo pipefail

echo "Deploying AKS \"${AKS_NAME}\" to \"${AZ_RESOURCE_GROUP}\" resource group"
az deployment group create \
  --name "${NAME_PREFIX}-core-deployment" \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --template-file "./deploy/bicep/aks.bicep" \
  --parameters \
      namePrefix="${NAME_PREFIX}" \
      acrResourceGroup="${ACR_RESOURCE_GROUP}" \
      acrName="${ACR_NAME}"

popd