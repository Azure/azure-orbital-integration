# Orbital Helper UI

This project provides a supplementary user interface for Azure Orbital Ground Station. Functionality includes:

-   Contact summary viewer: simplified way of filtering and viewing contact summary including:
    -   Contact start date
    -   Status
    -   Contact name
    -   Contact profile name
    -   Ground station name
-   Health checker
    -   Checks existence of resources deployed by TCP to BLOB

## Prerequisites

-   NodeJS LTS (16 or later)
-   [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) (recommended) You can use `npm`, but README
    uses `yarn`
-   Azure subscription access
-   [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)

## Setup

requires: Unix-like environment or Mac

1. Ensure [logged in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) to Azure CLI and default
   subscription is set.
    1. `az login` (see [docs](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli))
    2. `az account set -s "${SUBSCRIPTION_ID}"` (
       see [docs](https://docs.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli#change-the-active-subscription))
2. From `azure-orbital-integration` directory: `yarn install && yarn build-tools`

## Run

`yarn start-ui` or from `tools/orbital-helper-ui` directory: `yarn start-dev` (to re-build and run)
