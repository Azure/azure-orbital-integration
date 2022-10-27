#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

echo "Checking required env vars."
declare -a required_env_vars=(
  "AZ_LOCATION"
  "NAME_PREFIX"
)
for var_name in "${required_env_vars[@]}"
do
  if [[ -z "${!var_name}" ]]; then
      echo "Must set \"${var_name}\" env variable." 1>&2
      exit 1
  fi
done

