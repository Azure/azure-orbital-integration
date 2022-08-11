#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

. ./deploy/env-prereq-defaults.sh
echo "Loading core env defaults."
export AKS_CONTACT_DATA_STORAGE_CONTAINER=${AKS_CONTACT_DATA_STORAGE_CONTAINER:-"${NAME_PREFIX}-output"}

export AKS_VNET=${AKS_VNET:-"${NAME_PREFIX}-vnet"}
export AKS_VNET_ADDR_PREFIX=${AKS_VNET_ADDR_PREFIX:-'10.0.0.0/8'}
echo "AKS_VNET = \"${AKS_VNET}\""

export AKS_VNET_ID="/subscriptions/${AZ_SUBSCRIPTION}/resourceGroups/${AZ_RESOURCE_GROUP}/providers/Microsoft.Network/virtualNetworks/${AKS_VNET}"
echo "AKS_VNET_ID = \"${AKS_VNET_ID}\""

export AKS_VNET_SUBNET_ADDR_PREFIX=${AKS_VNET_SUBNET_ADDR_PREFIX:-'10.240.0.0/16'}
echo "AKS_VNET_SUBNET_ADDR_PREFIX = \"${AKS_VNET_SUBNET_ADDR_PREFIX}\""

export LB_IP=${LB_IP:-'10.240.11.11'}
echo "LB_IP = \"${LB_IP}\""

export AKS_POD_SUBNET_ADDR_PREFIX=${AKS_POD_SUBNET_ADDR_PREFIX:-'10.241.0.0/16'}
echo "AKS_POD_SUBNET_ADDR_PREFIX = \"${AKS_POD_SUBNET_ADDR_PREFIX}\""

export AKS_ORBITAL_SUBNET_ADDR_PREFIX=${AKS_ORBITAL_SUBNET_ADDR_PREFIX:-'10.244.0.0/16'}
echo "AKS_ORBITAL_SUBNET_ADDR_PREFIX = \"${AKS_ORBITAL_SUBNET_ADDR_PREFIX}\""

export AKS_NUM_REPLICAS=${AKS_NUM_REPLICAS:-2} 
echo "AKS_NUM_REPLICAS = \"${AKS_NUM_REPLICAS}\""

export HOST="0.0.0.0"
echo "HOST = \"${HOST}\""

export PORT=${PORT:-50111}
echo "PORT = \"${PORT}\""

export SOCKET_TIMEOUT_SECONDS=${SOCKET_TIMEOUT_SECONDS:-60}
echo "SOCKET_TIMEOUT_SECONDS = \"${SOCKET_TIMEOUT_SECONDS}\""

export NUM_BLOCK_LOG_FREQUENCY=${NUM_BLOCK_LOG_FREQUENCY:-4000}
echo "NUM_BLOCK_LOG_FREQUENCY = \"${NUM_BLOCK_LOG_FREQUENCY}\""

export CANARY_NUM_LINES=${CANARY_NUM_LINES:-65000}
echo "CANARY_NUM_LINES = \"${CANARY_NUM_LINES}\""

if [[ -z "${CONTACT_DATA_STORAGE_CONNECTION_STRING}" ]]; then
    echo '"CONTACT_DATA_STORAGE_CONNECTION_STRING" env variable not defined. Getting connection string from "STORAGE_ACCT".'
    export CONTACT_DATA_STORAGE_CONNECTION_STRING=$(az storage account show-connection-string --resource-group "${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}" -n "${CONTACT_DATA_STORAGE_ACCT}" --query "connectionString" -otsv)
fi
echo "CONTACT_DATA_STORAGE_CONNECTION_STRING = \"<MASKED>\""