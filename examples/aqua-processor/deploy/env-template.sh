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
export ENVIRONMENT_NAME="Aqua-FileEventService"
export AZ_VM_USER_HOME_FOLDER="/home/azureuser"
export SERVICE_BUS_QUEUE_NAME="contact-data"
export RTSTPS_OUTPUT_CONATINER_NAME="pds"
export RTSTPS_OUTPUT_SUBFOLDER_PATH="pds_files"
export MODIS_OUTPUT_CONTAINER_NAME="modis"
export LEVEL0_OUTPUT_SUBFOLDER_PATH="level0"
export LEVEL1_OUTPUT_SUBFOLDER_PATH="level1"
export LEVEL2_OUTPUT_SUBFOLDER_PATH="level2"
export LEVEL1_ALT1_OUTPUT_SUBFOLDER_PATH="level1-alt1"
export LEVEL2_ALT1_OUTPUT_SUBFOLDER_PATH="level2-alt1"
#####################################################################
