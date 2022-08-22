#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.
set -eux

echo -n "SPA: $1 "
/ipopp/drl/tools/SPAruntime.sh $1 | tr '\n' ' ' 
echo ''
