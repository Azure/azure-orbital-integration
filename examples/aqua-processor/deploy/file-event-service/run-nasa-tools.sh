#!/bin/bash
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

set -eo pipefail

RAW_CONTACT_FILE=$(echo ${FES_EVENT_GRID_EVENT} | jq -r '.Data.FullFilePath')
CORRELATION_ID=$(echo ${FES_EVENT_GRID_EVENT} | jq -r '.Data.CorrelationId')

# Run RT-STPS
./bin/batch.sh config/aqua.xml ${RAW_CONTACT_FILE} 2>&1 | logger -p local0.info -s -t $CORRELATION_ID

# Copy output PDS files to the IPOPP landing zone to be ingested and processed by IPOPP.
mkdir -p /home/azureuser/data-staging
cp /home/azureuser/data/*.PDS  /home/azureuser/drl/data/dsm/ingest/

# Move the files to a staging folder where they will be picked up for blob upload.
mv /home/azureuser/data/*.PDS /home/azureuser/data-staging/

# Run ingest_ipopp.sh to trigger IPOPP processing.
/home/azureuser/drl/tools/ingest_ipopp.sh 2>&1 | logger -p local0.info -s -t $CORRELATION_ID