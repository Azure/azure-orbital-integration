#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eux

WORKING_DIR="$(dirname "$0")"

az deployment sub create \
  --name "aoi-central-logging" \
  --location ${LOCATION} \
  --template-file ${WORKING_DIR}/main.bicep \
  --parameters \
    namePrefix="${NAME_PREFIX}" \
    location="${LOCATION}" \
    tcpToBlobRg="${TCP_TO_BLOB_RG}" \
    tcpToBlobLawName="${TCP_TO_BLOB_LAW_NAME}" \
    aquaRg="${AQUA_RG}" \
    aquaLawName="${AQUA_LAW_NAME}" \
  --confirm-with-what-if
