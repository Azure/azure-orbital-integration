#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eux

WORKING_DIR="$(dirname "$0")"

az deployment sub create \
  --name "aoi-aqua-processor" \
  --location ${LOCATION} \
  --template-file ${WORKING_DIR}/main.bicep \
  --parameters \
    location="${LOCATION}" \
    namePrefix="${NAME_PREFIX}" \
    allowedSshIpAddress="${ALLOWED_SSH_IP_ADDRESS}" \
    adminPublicKey="$(cat ~/.ssh/id_rsa.pub)" \
  --confirm-with-what-if