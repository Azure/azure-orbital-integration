#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

# The following is a template for the required env vars.
# Please see the README for more details

########################### *REQUIRED* ##############################
# Please adjust the following variables as needed for you environment
#####################################################################
export AZ_LOCATION="westus2"
export NAME_PREFIX="aoi-aqua"
export ALLOWED_SSH_IP_ADDRESS=""
export CONTACT_STORAGE_ACCOUNT_NAME=""
export CONTACT_STORAGE_ACCOUNT_RESOURCE_GROUP=""
export SERVICE_BUS_NAMESPACE=""
export SERVICE_BUS_RESOURCE_GROUP=""

############################ OPTIONAL ###############################
# Please adjust the following variables as needed for you environment
#####################################################################
export SERVICE_BUS_AUTH_RULE_NAME="RootManageSharedAccessKey"
export ENVIRONMENT_NAME="BlobDownloadService"
export RECEIVER_NAME="BlobDataReceiver"
export LOCAL_BLOB_DOWNLOAD_PATH="/home/azureuser/blobdata"
export ALLOWED_EVENT_TYPE="Microsoft.Storage.BlobCreated"
export SERVICE_BUS_QUEUE_NAME="contact-data"
#####################################################################