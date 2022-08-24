#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

WORKING_DIR="$(dirname "$0")"
BLOB_DOWNLOAD_SERVICE_SRC_DIR="${WORKING_DIR}/../../../blob-download-service/src"
ARTIFACTS_DIR="${WORKING_DIR}/artifacts/linux-x64"
ARTIFACTS_CONTAINER_NAME="artifacts"

# Deploy some prerequisites, capture the outputs from the deployment and create vars from the required outputs
PREREQ_DEPLOYMENT_OUTPUT=$(az deployment sub create --name "aoi-aqua-prereq" --location ${AZ_LOCATION} --template-file ${WORKING_DIR}/prereq.bicep --parameters location="${AZ_LOCATION}" namePrefix="${NAME_PREFIX}" --query "properties.outputs" -o json)

APPLICATION_INSIGHTS_APP_NAME=$(echo ${PREREQ_DEPLOYMENT_OUTPUT} | jq -r '.applicationInsightsName.value')
APPLICATION_INSIGHTS_RG=$(echo ${PREREQ_DEPLOYMENT_OUTPUT} | jq -r '.applicationInsightsRg.value')
STORAGE_ACCOUNT_NAME=$(echo ${PREREQ_DEPLOYMENT_OUTPUT} | jq -r '.storageAccountName.value')

# Prepare the settings, scripts and binaries and stage it in the artifacts folder
${WORKING_DIR}/blob-download-service/prepare-artifacts.sh $APPLICATION_INSIGHTS_APP_NAME $APPLICATION_INSIGHTS_RG

az storage container create --account-name ${STORAGE_ACCOUNT_NAME} --name ${ARTIFACTS_CONTAINER_NAME}
az storage blob upload --account-name ${STORAGE_ACCOUNT_NAME} --container-name ${ARTIFACTS_CONTAINER_NAME} --file ${ARTIFACTS_DIR}/artifacts.tar.gz --name artifacts.tar.gz --overwrite
az storage blob upload --account-name ${STORAGE_ACCOUNT_NAME} --container-name ${ARTIFACTS_CONTAINER_NAME} --file ${WORKING_DIR}/blob-download-service/install.sh --name install.sh --overwrite

az deployment sub create \
  --name "aoi-aqua-main" \
  --location ${AZ_LOCATION} \
  --template-file ${WORKING_DIR}/main.bicep \
  --parameters \
    location="${AZ_LOCATION}" \
    namePrefix="${NAME_PREFIX}" \
    allowedSshIpAddress="${ALLOWED_SSH_IP_ADDRESS}" \
    adminPublicKey="$(cat ~/.ssh/id_rsa.pub)"