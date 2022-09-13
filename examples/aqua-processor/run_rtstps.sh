#!/bin/sh
# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.
set -eux

## Get access to the storage container

# login with the user-assigned managed identity
azcopy login --identity --identity-client-id "${UAMI_CLIENT_ID}"
# list all the files in the container
azcopy list ${INPUT_CONTAINER_URL}

## Copy a random file

# Pick a random file. 
# tail skips the first two lines
# cut splits lines by space, only keeps the second segment
# tr removes ';'
# shuf shuffles the lines
# final tail picks the last line
FILENAME=$(azcopy list ${INPUT_CONTAINER_URL} | tail -n +2 | cut -d " " -f 2 | tr -d ";" | shuf | tail -n 1)

# make a directory for the input file
mkdir -p /tmp/inputfiles
# copy the file
azcopy copy ${INPUT_CONTAINER_URL}/${FILENAME} /tmp/inputfiles

## Run rt-stps

# cd to the rtstps directory
cd ${HOME}/rtstps_install/rtstps/rt-stps
# run rtstps and write the logs to system log
./bin/batch.sh config/aqua.xml /tmp/inputfiles/${FILENAME} | logger -s -p local1.info -t $(uuidgen)

# you can remove the input file after run rtstps using the following command
# rm /tmp/inputfiles/${FILENAME}
