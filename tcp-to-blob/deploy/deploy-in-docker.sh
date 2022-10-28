#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

PROJECT_DIR="$(dirname -- "$0")/.."
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"

mkdir tcp-to-blob/.env
envsubst < tcp-to-blob/deploy/env-template.sh > tcp-to-blob/.env/env-template.sh

popd
