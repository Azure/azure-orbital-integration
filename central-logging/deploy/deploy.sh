#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

WORKING_DIR="$(dirname "$0")"

az deployment sub create \
  --name "aoi-central-logging" \
  --location ${AZ_LOCATION} \
  --template-file ${WORKING_DIR}/main.bicep \
  --parameters \
    namePrefix="${NAME_PREFIX}" \
    location="${AZ_LOCATION}" \
    tcpToBlobRg="${TCP_TO_BLOB_RG}" \
    tcpToBlobLawName="${TCP_TO_BLOB_LAW_NAME}" \
    aquaRg="${AQUA_RG}" \
    aquaLawName="${AQUA_LAW_NAME}"
