#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

echo "Deploying service and dashboards."

PROJECT_DIR="$(dirname -- "$0")/../.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"

. ./deploy/env-defaults.sh

# Login to AKS
echo "Getting credentials for \"${AKS_NAME}\" AKS cluster."
az aks get-credentials --resource-group "${AZ_RESOURCE_GROUP}" --name "${AKS_NAME}"

# Login to
echo "Logging into \"${ACR_NAME}\" ACR."
az acr login -n "${ACR_NAME}" --expose-token

# Create storage connection string secret
echo "Checking for AKS storage secret: \"${CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY}\""
if [ -n "$(kubectl get secret "${CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY}" --ignore-not-found)" ];
then
  echo "Storage connection string secret exists. Deleting before re-creating."
  kubectl delete secret "${CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY}" --ignore-not-found
fi
echo "Creating storage connection string secrets."
kubectl create secret generic "${CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY}" \
  --from-literal=connection-string="${CONTACT_DATA_STORAGE_CONNECTION_STRING}"

set -euo pipefail

echo "Installing dependencies"
npx yarn install

echo "Running build"
npx yarn build

# Build & deploy TCP to BLOB
echo "Deploying TCP to BLOB service to \"${AKS_NAME}\"."
npx yarn deploy

echo "Creating dashboard."
npx yarn deploy-dashboard

# Build & deploy canary
echo "Publishing canary image."
npx yarn docker-push-text-canary

npx yarn make-contact-profile

SLEEP_SECONDS_BEFORE_CANARY=60
echo "Waiting ${SLEEP_SECONDS_BEFORE_CANARY} seconds for service to initialize before running canary."
sleep $SLEEP_SECONDS_BEFORE_CANARY;
# TODO: Experiment with wait that works best or better way to run upon service initialization.
echo "Running Canary Kubernetes Job."
npx yarn run-text-canary

# If deployed to different cluster, you can use --context:
# e.g. `kubectl --context tcp-to-blob-canary-dev delete -f ./.env/tcp-to-blob-canary.yaml

# TODO: Write params needed for deploying Orbital contact profile to a file
#  that can be loaded (as env variable) when (using Orbital Helper for )
#  creating a contact profile targeting this deployed TCP to BLOB endpoint.
#  See arm-orbital-helper/src/samples/createSyntheticContactProfile.ts
#  Need:
# • endpointName
# • endpointIP
# • endpointPort
# • subnetId

popd
