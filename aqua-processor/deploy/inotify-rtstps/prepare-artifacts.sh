#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

WORKING_DIR="$(dirname "$0")"
ARTIFACTS_DIR="${WORKING_DIR}/../artifacts/linux-x64/inotify-rtstps"
mkdir -p ${ARTIFACTS_DIR}

# Stage other scripts in artifacts folder to be copied over
cp ${WORKING_DIR}/INotifyRTSTPS.service ${ARTIFACTS_DIR}
cp ${WORKING_DIR}/inotify-rtstps.sh ${ARTIFACTS_DIR}

tar -czvf "${ARTIFACTS_DIR}/inotify-rtstps-artifacts.tar.gz" -C ${ARTIFACTS_DIR} .
