#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

case "$(pidof BlobDownloadService | wc -w)" in
  1) systemctl stop BlobDownloadService
esac

RUNTIME="linux-x64"
WORKING_DIR="$(dirname "$0")"
LOCAL_ARTIFACTS_FOLDER="artifacts"

# Extract artifacts
mkdir -p ${LOCAL_ARTIFACTS_FOLDER}
tar -zvxf ./artifacts.tar.gz -C ${LOCAL_ARTIFACTS_FOLDER}

# Install BlobDownloadService
yum install -y libicu
mkdir -p /usr/share/BlobDownloadService

cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/BlobDownloadService /usr/share/BlobDownloadService/
cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/appsettings.json /usr/share/BlobDownloadService/
cp ${WORKING_DIR}/${LOCAL_ARTIFACTS_FOLDER}/BlobDownloadService.service /etc/systemd/system/BlobDownloadService.service

systemctl enable BlobDownloadService
systemctl start BlobDownloadService
