#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

APPLICATION_INSIGHTS_APP_NAME=${1}
APPLICATION_INSIGHTS_RG=${2}

WORKING_DIR="$(dirname "$0")"
BLOB_DOWNLOAD_SERVICE_SRC_DIR="${WORKING_DIR}/../../../blob-download-service/src"
ARTIFACTS_DIR="${WORKING_DIR}/../artifacts/linux-x64/blob-download-service"
mkdir -p ${ARTIFACTS_DIR}

# Build the binaries and stage them in the artifacts folder
dotnet publish ${BLOB_DOWNLOAD_SERVICE_SRC_DIR}/BlobDownloadService.csproj --configuration Release --runtime linux-x64 --self-contained --output ${ARTIFACTS_DIR}

# Secrets that get retrieved using az cli. The UAMI associated with the
# VM needs to have Contributor permissions for the folloing 3 resources
APP_INSIGHTS_CONNECTION_STRING=$(az monitor app-insights component show --app ${APPLICATION_INSIGHTS_APP_NAME} -g ${APPLICATION_INSIGHTS_RG} --query 'connectionString' -otsv)
SERVICE_BUS_CONNECTION_STRING=$(az servicebus namespace authorization-rule keys list -g ${SERVICE_BUS_RESOURCE_GROUP} --namespace-name ${SERVICE_BUS_NAMESPACE} -n ${SERVICE_BUS_AUTH_RULE_NAME} --query 'primaryConnectionString' -otsv)
BLOB_CONNECTION_STRING=$(az storage account show-connection-string -g ${CONTACT_STORAGE_ACCOUNT_RESOURCE_GROUP} -n ${CONTACT_STORAGE_ACCOUNT_NAME} --query 'connectionString' -otsv)

cat ${WORKING_DIR}/appsettings.template.json | \
  APP_INSIGHTS_CONNECTION_STRING=${APP_INSIGHTS_CONNECTION_STRING} \
  ENVIRONMENT_NAME=${ENVIRONMENT_NAME} \
  RECEIVER_NAME=${RECEIVER_NAME} \
  SERVICE_BUS_CONNECTION_STRING=${SERVICE_BUS_CONNECTION_STRING} \
  SERVICE_BUS_QUEUE_NAME=${SERVICE_BUS_QUEUE_NAME} \
  BLOB_CONNECTION_STRING=${BLOB_CONNECTION_STRING} \
  LOCAL_BLOB_DOWNLOAD_PATH=${LOCAL_BLOB_DOWNLOAD_PATH} \
  ALLOWED_EVENT_TYPE=${ALLOWED_EVENT_TYPE} \
  envsubst > ${ARTIFACTS_DIR}/appsettings.json

# Stage other scripts in artifacts folder to be copied over
cp ${WORKING_DIR}/BlobDownloadService.service ${ARTIFACTS_DIR}

tar -czvf "${ARTIFACTS_DIR}/blob-download-service-artifacts.tar.gz" -C ${ARTIFACTS_DIR} .
