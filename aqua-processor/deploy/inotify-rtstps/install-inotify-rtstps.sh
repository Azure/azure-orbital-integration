#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

case "$(pidof INotifyRTSTPS | wc -w)" in
  1) systemctl stop INotifyRTSTPS
esac

RUNTIME="linux-x64"
WORKING_DIR="$(dirname "$0")"
LOCAL_ARTIFACTS_FOLDER="inotify-rtstps-artifacts"

# Extract artifacts
mkdir -p ${LOCAL_ARTIFACTS_FOLDER}
tar -zvxf ./inotify-rtstps-artifacts.tar.gz -C ${LOCAL_ARTIFACTS_FOLDER}

# Install BlobDownloadService
yum install -y epel-release
yum install -y inotify-tools
mkdir -p /usr/share/INotifyRTSTPS

cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/inotify-rtstps.sh /usr/share/INotifyRTSTPS/
cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/INotifyRTSTPS.service /etc/systemd/system/INotifyRTSTPS.service
