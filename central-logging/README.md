# Central Logging
An optional centralized logging component for the Azure Orbital Integration solution that brings logging together from the tcp-to-blob and Aqua processing components. This will provide storage of all logs backed by [Azure Data Explorer](https://docs.microsoft.com/en-us/azure/data-explorer/data-explorer-overview)

## Prerequisites
* tcp-to-blob deployed
* processor deployed
* Azure subscription access
* Azure CLI

## Create Environment File
In the root of the central-logging folder, there is a file named `env-sample.sh`. It is recommended to copy this file to a folder named `.env`. the `.env` folder is part of gitignore so any sensitive information that is in that folder won't accidentally get checked in to any repositories.

In the following steps, we will assume that you keep the name of `env-sample.sh`. You are free to adjust as you see fit.

1. Make the .env folder `mkdir -p ./.env`
2. Copy the sample env file `cp ./env-sample.sh ./.env/env-sample.sh`
3. Edit `./.env/env-sample.sh`
  * NAME_PREFIX: Used as a prefix pattern for generating resource group and resources. Something short simple and descriptive is ideal.
  * LOCATION: The location where the resources will be deployed.
  * TCP_TO_BLOB_RG: The resource group name of the tcp-to-blob component.
  * TCP_TO_BLOB_LAW_NAME: The Log Analytics Workspace name that is deployed to the TCP_TO_BLOB_RG.
  * AQUA_RG: The resource group name of the processor component.
  * AQUA_LAW_NAME: The Log Analytics Workspace name that is deployed to the AQUA_RG.

## Deploy
requires: Unix-like environment or Mac
1. Ensure [logged in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) to Azure CLI and default subscription is set. 
   1. `az login` (see [docs](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli))
   2. `az account set -s "${SUBSCRIPTION_ID}"` (see [docs](https://docs.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli#change-the-active-subscription))
2. Change directory `cd central-logging`
3. Source your environment file `. ./.env/env-sample.sh`
4. Run deploy `./deploy/deploy.sh`

## Validate
Once the deployment is complete, it could take some time for the logs to start showing up in Azure Data Explorer. The initial logs could take up to 30 minutes and once flowing, log latency will be 5 - 10 minutes.

Browse to the central logging resource -> Azure Data Explorer -> Query on the left hand side. If you are receiving contact data via tcp-to-blob and processing via processor, you should see logs under Syslog and ContainerLog.