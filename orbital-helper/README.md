<!---
  Copyright (c) 2022 Microsoft Corporation. All rights reserved.
  Software is licensed under the MIT License. See LICENSE in the project
  root for license information.
-->

# ARM Orbital Helper

ARM Orbital Helper package provides a user-friendly helper for accomplishing tasks related to [Azure Orbital Ground Station(AOGS)](https://docs.microsoft.com/en-us/azure/orbital/overview). It also serves as a proof of concept for using the `@azure/arm-orbital` NodeJS SDK.

## Functionality

-   Create contact profile.
-   Find next available contact matching specified criteria.
-   Schedule contact.
-   Schedule next available contact matching specified criteria.
-   Search scheduled contacts matching specified criteria.
-   Get current TLE for specified TLE title (`tleHelper.ts`).
-   Update spacecraft TLE.

## Organization

-   `src/orbitalHelper.ts`: Primary Orbital Helper re-usable library.
-   `src/samples`: [samples](src/samples) for how to use Orbital Helper.These samples serve as:
    -   Documentation for how to use the Orbital Helper SDK.
    -   A rudimentary CLI.
-   `src/tleHelper.ts`: Library for getting current TLEs from Celestrak.

## Pre-requisites

-   [NodeJS](https://nodejs.dev/download/) LTS
-   [Yarn](https://classic.yarnpkg.com/en/docs/getting-started) (optional but recommended)
-   Create an endpoint to receive satellite data via TCP connection:
    -   [tcp-to-blob](../tcp-to-blob) is an example of a TCP endpoint that could be used to receive contact data and save
        it to Azure BLOB storage.
    -   [Prepare network](https://review.docs.microsoft.com/en-us/azure/orbital/howto-prepare-network?branch=release-ga-orbital)
        .

## Install and compile

1. `cd arm-orbital-helper`
2. `yarn install`
3. Compile:
    1. `npx tsc`: once
    2. `npx tsc -w`: automatically as code is changed

## Environment variables

`No environment variables are required to use Orbital Helper as an SDK`, however; you can use Orbital Helper as a
rudimentary CLI by using following environment variables.

Environment variables are checked as needed at runtime and an instructive Error is provided when missing.

Recommend creating a `./.env/env.sh` to set these and re-load env as needed without risking committing them to version
control.

For your convenience, you can copy [env-template.sh](env-template.sh) to `./.env/env.sh`, set your values there and
run `. .env/env.sh`.

-   `AZ_SUBSCRIPTION`
-   `AZ_LOCATION`: e.g. "westus2"
-   `SPACECRAFT_NAME`: e.g. "AQUA"
-   `GROUND_STATION_NAME`: e.g. "microsoft_quincy".
-   `CONTACT_PROFILE_NAME`: e.g. "tcp-to-blob"
-   `ENDPOINT_NAME`: e.g. "tcp-to-blob"
-   `ENDPOINT_IP`
-   `ENDPOINT_PORT`
-   `ENDPOINT_SUBNET_ID`: See "Prepare network" above. Get subnet ID for Orbital delegated subnet
    via [AZ CLI](https://docs.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest#az-network-vnet-subnet-list)
    or Azure Portal.

Optional environment variables for overriding TLE provider:

-   `TLE_PROVIDER_HOSTNAME`: defaults to "celestrak.org"
-   `TLE_PROVIDER_PATH`: defaults to "/NORAD/elements/active.txt"

## Running samples (as a CLI)

1. Ensure you've installed and compiled as described above.
2. `cd arm-orbital-helper`

| Task                            | Command                                               |
| :------------------------------ | :---------------------------------------------------- |
| Create contact profile          | `node ./dist/src/samples/createContactProfile.js`         |
| Get next available contact      | `node ./dist/src/samples/getNextAvailableContact.js`      |
| Schedule contact                | `node ./dist/src/samples/scheduleContact.js`              |
| Schedule next available contact | `node ./dist/src/samples/scheduleNextAvailableContact.js` |
| Search scheduled contacts       | `node ./dist/src/samples/searchScheduledContacts.js`      |
| Update spacecraft TLE           | `node ./dist/src/samples/updateSpacecraftTLE.js`          |

## License

Copyright &copy; 2022 Microsoft. This Software is licensed under the MIT License. See [LICENSE](./LICENSE) in the project root for more information.
