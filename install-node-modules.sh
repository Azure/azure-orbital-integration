#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

PROJECT_DIR="$(dirname -- "$0")"
echo "PROJECT_DIR: \"${PROJECT_DIR}\""
pushd "${PROJECT_DIR}"

echo "Installing node modules"
npm install
npx yarn install --prod=false

popd