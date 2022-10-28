#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -euo pipefail

PROJECT_DIR="$(dirname -- "$0")/../.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"
./install-node-modules.sh
npx yarn build
mkdir tcp-to-blob/.env
echo "Creating \"tcp-to-blob/.env/env-template.sh\""
echo "  • NAME_PREFIX=\"${NAME_PREFIX}\""
envsubst < tcp-to-blob/deploy/env-template.sh > tcp-to-blob/.env/env-template.sh

. tcp-to-blob/.env/env-template.sh
tcp-to-blob/deploy/bicep/deploy.sh

popd
