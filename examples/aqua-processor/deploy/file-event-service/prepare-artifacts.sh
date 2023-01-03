#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

APPLICATION_INSIGHTS_APP_NAME=${1}
APPLICATION_INSIGHTS_RG=${2}

WORKING_DIR="$(dirname "$0")"
FILE_EVENT_SERVICE_SRC_DIR="${WORKING_DIR}/../../../../file-event-service/src"
ARTIFACTS_DIR="${WORKING_DIR}/../artifacts/linux-x64/file-event-service"
mkdir -p ${ARTIFACTS_DIR}

# Build the binaries and stage them in the artifacts folder
dotnet publish ${FILE_EVENT_SERVICE_SRC_DIR}/FileEventService.csproj --configuration Release --runtime linux-x64 --self-contained --output ${ARTIFACTS_DIR}

# Secrets that get retrieved using az cli. The UAMI associated with the
# VM needs to have Contributor permissions for the folloing 3 resources
APP_INSIGHTS_CONNECTION_STRING=$(az monitor app-insights component show --app ${APPLICATION_INSIGHTS_APP_NAME} -g ${APPLICATION_INSIGHTS_RG} --query 'connectionString' -otsv)
SERVICE_BUS_CONNECTION_STRING=$(az servicebus namespace authorization-rule keys list -g ${SERVICE_BUS_RESOURCE_GROUP} --namespace-name ${SERVICE_BUS_NAMESPACE} -n ${SERVICE_BUS_AUTH_RULE_NAME} --query 'primaryConnectionString' -otsv)
BLOB_CONNECTION_STRING=$(az storage account show-connection-string -g ${CONTACT_STORAGE_ACCOUNT_RESOURCE_GROUP} -n ${CONTACT_STORAGE_ACCOUNT_NAME} --query 'connectionString' -otsv)

cat ${WORKING_DIR}/appsettings.template.json | \
  APP_INSIGHTS_CONNECTION_STRING=${APP_INSIGHTS_CONNECTION_STRING} \
  envsubst > ${ARTIFACTS_DIR}/appsettings.json

cat ${WORKING_DIR}/file-event-service.template.json | \
  APP_INSIGHTS_CONNECTION_STRING=${APP_INSIGHTS_CONNECTION_STRING} \
  FILE_EVENT_SERVICE_ENVIRONMENT_NAME=${FILE_EVENT_SERVICE_ENVIRONMENT_NAME} \
  SERVICE_BUS_CONNECTION_STRING=${SERVICE_BUS_CONNECTION_STRING} \
  SERVICE_BUS_QUEUE_NAME=${SERVICE_BUS_QUEUE_NAME} \
  BLOB_CONNECTION_STRING=${BLOB_CONNECTION_STRING} \
  AZ_VM_USER_HOME_FOLDER=${AZ_VM_USER_HOME_FOLDER} \
  RTSTPS_OUTPUT_CONATINER_NAME=${RTSTPS_OUTPUT_CONATINER_NAME} \
  RTSTPS_OUTPUT_SUBFOLDER_PATH=${RTSTPS_OUTPUT_SUBFOLDER_PATH} \
  MODIS_OUTPUT_CONTAINER_NAME=${MODIS_OUTPUT_CONTAINER_NAME} \
  envsubst > ${ARTIFACTS_DIR}/file-event-service.json

# Stage other scripts in artifacts folder to be copied over
cp ${WORKING_DIR}/FileEventService.service ${ARTIFACTS_DIR}
cp ${WORKING_DIR}/run-nasa-tools.sh ${ARTIFACTS_DIR}

tar -czvf /tmp/file-event-service-artifacts.tar.gz -C ${ARTIFACTS_DIR} .

mv /tmp/file-event-service-artifacts.tar.gz ${ARTIFACTS_DIR}

