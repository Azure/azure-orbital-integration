#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

if [[ -z "$DOCKER_TAG" ]]; then
    echo "make_docker_image: Must provide docker tag (DOCKER_TAG)." 1>&2
    exit 1
fi
if [[ -z "$DOCKER_FILE" ]]; then
    echo "make_docker_image: Must provide docker file (DOCKER_FILE)." 1>&2
    exit 1
fi
echo "Adding \"${DOCKER_TAG}\" image to \"${ACR_NAME}\" ACR.";
az acr build -t "${DOCKER_TAG}" -r "${ACR_NAME}" --file "${DOCKER_FILE}" --build-arg BUNDLE_DIR='.' ./dist/bundle;
