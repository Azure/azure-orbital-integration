#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

# Source the environment file for the stage you wish to deploy.
# Use deploy/env-template.sh as a template.
# Consider putting your "env-<env-name>.sh" scripts in the ".env" directory which is ignored by git.
# e.g. `. ./.env/env-dev.sh`

set -eo pipefail

PROJECT_DIR="$(dirname -- "$0")/../.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"
./deploy/bicep/deploy-prereq.sh
./deploy/bicep/deploy-core.sh
./deploy/az-cli/deploy-service-and-dashboards.sh

popd