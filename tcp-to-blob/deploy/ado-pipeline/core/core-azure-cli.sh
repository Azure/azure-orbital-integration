#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

echo "Install and compile dependencies"
yarn install && yarn compile

cd tcp-to-blob

echo Run Build
yarn build

set -eo pipefail
./deploy/check-required-env.sh
. ./deploy/env-defaults.sh
yarn make-env-files
set -euo pipefail

cp -r ./dist "${WORKING_DIR}"

./deploy/bicep/deploy-core.sh
