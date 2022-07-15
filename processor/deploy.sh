#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eux


az group create \
  --name $RESOURCE_GROUP_NAME \
  --location $LOCATION

az deployment group create \
    --name $DEPLOYMENT_NAME \
    --resource-group $RESOURCE_GROUP_NAME \
    --template-file ./main.bicep \
    --parameters adminPublicKey="$SSH_PUBLIC_KEY" \
    --parameters parameters.json \
    --confirm-with-what-if