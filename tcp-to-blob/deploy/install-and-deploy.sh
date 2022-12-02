#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -euo pipefail

if [[ -z "$NAME_PREFIX" ]]; then
  . tcp-to-blob/.env/env-template.sh || (echo "Set NAME_PREFIX or open a new shell window and run 'docker cp ./tcp-to-blob/.env/ t2b-deploy:/home/azure-orbital-integration/tcp-to-blob/'." && exit 1)
fi

az account show # Fail fast if not logged in.
PROJECT_DIR="$(dirname -- "$0")/../.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"
./install-node-modules.sh
npx yarn build
tcp-to-blob/deploy/bicep/deploy.sh

popd
