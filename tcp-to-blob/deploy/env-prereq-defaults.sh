#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

echo "Loading prereq env defaults."
export AZ_SUBSCRIPTION="$(az account list --query "[?isDefault].id" -o tsv)"
echo "AZ_SUBSCRIPTION = \"${AZ_SUBSCRIPTION}\""

export AZ_RESOURCE_GROUP=${AZ_RESOURCE_GROUP:-"${NAME_PREFIX}-rg"}
echo "AZ_RESOURCE_GROUP = \"${AZ_RESOURCE_GROUP}\""

export AKS_NAME=${AKS_NAME:-"${NAME_PREFIX}-aks"}
echo "AKS_NAME = \"${AKS_NAME}\""

export STRIPPED_NAME="$(echo "${NAME_PREFIX}" | tr -d '-')"
echo "STRIPPED_NAME = \"${STRIPPED_NAME}\""

export ACR_RESOURCE_GROUP=${ACR_RESOURCE_GROUP:-"${AZ_RESOURCE_GROUP}"}
echo "ACR_RESOURCE_GROUP = \"${ACR_RESOURCE_GROUP}\""

export ACR_NAME=${ACR_NAME:-"${STRIPPED_NAME}acr"}
echo "ACR_NAME = \"${ACR_NAME}\""

export CONTACT_DATA_STORAGE_ACCT=${CONTACT_DATA_STORAGE_ACCT:-"${STRIPPED_NAME}storage"}
echo "CONTACT_DATA_STORAGE_ACCT = \"${CONTACT_DATA_STORAGE_ACCT}\""

export CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP=${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP:-"${AZ_RESOURCE_GROUP}"}
echo "CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP = \"${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}\""

export CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY="contact-data-storage-account-connection-string"
echo "CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY = \"${CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY}\""