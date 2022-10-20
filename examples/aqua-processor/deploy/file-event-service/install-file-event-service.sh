#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

case "$(pidof FileEventService | wc -w)" in
  1) systemctl stop FileEventService
esac

RUNTIME="linux-x64"
WORKING_DIR="$(dirname "$0")"
LOCAL_ARTIFACTS_FOLDER="file-event-service-artifacts"
FES_INSTALL_FOLDER="/usr/share/FileEventService"

# Extract artifacts
mkdir -p ${LOCAL_ARTIFACTS_FOLDER}
tar -zvxf ./file-event-service-artifacts.tar.gz -C ${LOCAL_ARTIFACTS_FOLDER}

# Install FileEventService
yum install -y epel-release
yum update -y
yum install -y libicu
yum install -y jq
mkdir -p ${FES_INSTALL_FOLDER}

cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/FileEventService ${FES_INSTALL_FOLDER}
cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/appsettings.json ${FES_INSTALL_FOLDER}
cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/file-event-service.json ${FES_INSTALL_FOLDER}
cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/run-nasa-tools.sh ${FES_INSTALL_FOLDER}
cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/FileEventService.service /etc/systemd/system/FileEventService.service

sudo systemctl daemon-reload
