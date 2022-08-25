#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

TARGET=/home/azureuser/blobdata/

inotifywait -m -e create -e moved_to --format "%f" $TARGET |
    while read FILENAME; do
        if [[ "$FILENAME" =~ .*tmp$ ]]; then
            echo "Ignoring .tmp files"
        else
            CORRELATION_ID=$(uuidgen)
            echo "CorrelationId:  $CORRELATION_ID"
            echo Detected $FILENAME, Running RT-STPS
            echo "Start|$FILENAME" 2>&1 | logger -p local0.info -s -t $CORRELATION_ID
            ./bin/batch.sh config/aqua.xml $TARGET/$FILENAME 2>&1 | logger -p local0.info -s -t $CORRELATION_ID
            echo "End|$FILENAME" 2>&1 | logger -p local0.info -s -t $CORRELATION_ID
        fi
    done
