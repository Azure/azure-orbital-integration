# Copyright (c) 2022 Microsoft Corporation. All rights reserved.
# Software is licensed under the MIT License. See LICENSE in the project
# root for license information.

ARG IMAGE_NAME=mcr.microsoft.com/mirror/docker/library/alpine
ARG IMAGE_TAG=3.15

FROM $IMAGE_NAME:$IMAGE_TAG

WORKDIR /app/

COPY  ./dist/bundle/tcp-to-blob.js .

RUN apk add --update nodejs

EXPOSE 3000/tcp

CMD [ "node", "tcp-to-blob.js" ]
