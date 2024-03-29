<!---
  Copyright (c) 2022 Microsoft Corporation. All rights reserved.
  Software is licensed under the MIT License. See LICENSE in the project
  root for license information.
-->

# TCP-to-BLOB

TCP to BLOB is a kubernetes service that provides a TCP endpoint to receive [Azure Orbital Ground Station (AOGS)](https://docs.microsoft.com/en-us/azure/orbital/overview) satellite downlink data and persists it in Azure BLOB Storage. This doc shows you how to deploy this architecture into Azure using the resources and code in this repository.

## High level components

- Vnet with subnets including:
  - `pod-subnet`: Where AKS TCP to BLOB instances will listen for TCP connections.
  - `orbital-subnet`: Delegated to Azure Orbital from which the service can send contact data to TCP to BLOB endpoint.
- Azure Container Registry.
- AKS cluster.
- Storage account and container for storing raw Orbital contact data.
- TCP to BLOB AKS service that listens for Orbital contact TCP connection and persists the TCP data to Azure BLOB storage.
- Orbital Contact profile configured with the appropriate endpoint and subnet for TCP to BLOB service.
- ADO Dashboard providing temporal view of TCP to BLOB activity and AKS cluster health.

## TCP to BLOB Service event lifecycle

1. `server-init`: Server starting up.
2. `socket-connect`: Client socket connected to server. (1 per socket)
3. `cleanup`: Purge un-needed resources. (`<n>` per socket)
4. `socket-data`: Process client data sent to socket. (`<n>` per socket)
5. `socket-error`: Error prior to completion. Terminates socket and initiates `socket-close` event. (0 or 1 per socket)
6. `socket-close`: All data has been received and written to file if applicable. Attempt uploading to BLOB. (1 per
   socket)
7. `complete`: Final event providing success/failure summary. (1 per socket)

## New to NodeJS?

A NodeJS project is defined by [package.json](package.json).

When you run `yarn <cmd>` (or alternatively `npm run <cmd>`), `yarn`/`npm` finds the <cmd> in the `scripts` of
package.json to determine what script are available.

To avoid requiring yarn to be installed globally, `yarn` is installed with `npm` at the root level (`azure-orbital-integration`).
When `npx yarn` is used throughout the examples, it uses the `yarn` installed in `azure-orbital-integration/node_modules`.

## Install NodeJS dependencies & build project

From `azure-orbital-integration` project root directory, run:
`./install-node-modules.sh && npx yarn build`

## Create environment file

1. `cd tcp-to-blob && mkdir .env`
2. `cp ./deploy/env-template.sh .env/env-<name_prefix>.sh`
3. Edit your env file as needed. See: "Environment variables" section below.

## Environment variables

Required:

- `NAME_PREFIX`: Used to make name for resources to create. e.g AKS cluster, vnet, etc.

Optional:

- `AZ_LOCATION`: Location where resources will be deployed. Should match spacecraft location. default: `"westus2"`.
- `AZ_RESOURCE_GROUP`: Resource group containing your AKS service.
- `ACR_NAME`: Name of your Azure Container Registry.
- `CONTACT_DATA_STORAGE_ACCT`: Name of storage account where BLOBs will be created (containing data sent to TCP
  endpoint).
- `CONTACT_DATA_STORAGE_CONTAINER`: Name of storage container for saving BLOBs. default: `"raw-contact-data"`
- `RAW_DATA_FILE_PATH`: Path to local file containing sample raw data to be uploaded to a BLOB where it can be used by the raw data canary.
- `RAW_DATA_BLOB_NAME`: Name of BLOB within `$CONTACT_DATA_STORAGE_CONTAINER` which will be streamed by raw data canary to TCP to BLOB endpoint. You may either upload this reference data using `npx yarn upload-raw-reference-data`, manually (consider using `reference-data/` prefix) or schedule a contact and reference the BLOB associated with the results.
- `CONTACT_DATA_STORAGE_CONNECTION_STRING`: (**Sensitive**) Connection string for contact data storage. Grants `tcp-to-blob` the ability to create the storage container if needed and create/write to BLOBs. This is stored as an AKS secret which is exposed as an environment variable in the `tcp-to-blob` container. You may use either:
  - [Storage BLOB connection string](https://docs.microsoft.com/en-us/azure/storage/common/storage-configure-connection-string): (default) Long living credentials for accessing storage container. This gets populated automatically if `CONTACT_DATA_STORAGE_CONNECTION_STRING` is not already set.
  - [SAS connection string](https://docs.microsoft.com/en-us/azure/storage/blobs/sas-service-create?tabs=javascript): Enables you to or the party to which you are delivering contact data, to specify duration and other fine-grained access characteristics. Consider using this if the data recipient (team managing/owning storage account and processing data) is not the same team as the Orbital subscription owner. Things to consider for SAS:
    - It is the responsibility of the storage account owner to create the SAS since it's not auto-created during TCP to BLOB deployment.
    - Storage account owner must coordinate with TCP to BLOB AKS cluster owner to rotate the `CONTACT_DATA_STORAGE_CONNECTION_STRING` AKS secret otherwise TCP to BLOB will fail to write to blob storage upon SAS expiration.
- `AKS_NAME`: Name of AKS cluster.
- `AKS_VNET`: default: `"${AKS_CLUSTER_NAME}-vnet"`
- `AKS_NUM_REPLICAS`: default: 2
- `HOST`: default: "0.0.0.0".
- `PORT`: default: 50111
- `NUM_BLOCK_LOG_FREQUENCY`: default: 4000
- `SOCKET_TIMEOUT_SECONDS`: Seconds of socket inactivity until socket is destroyed. default: 120
- `AKS_VNET_ADDR_PREFIX`: default: "10.0.0.0/8"
- `AKS_VNET_SUBNET_ADDR_PREFIX`: Subnet for AKS nodes. default: "10.240.0.0/16"
- `LB_IP`: IP address for the internal load balancer Orbital will hit. Should be in vnet IP range. default: "
  10.240.11.11"
- `AKS_POD_SUBNET_ADDR_PREFIX`: Subnet for AKS pods. default: "10.241.0.0/16"
- `AKS_ORBITAL_SUBNET_ADDR_PREFIX`: Subnet delegated to Orbital. default: "10.244.0.0/16"
- `CANARY_NUM_LINES`: Number of lines of text canary will send to TCP to BLOB. default: 65000
- `DEMODULATION_CONFIG`: Raw XML or named modem for the contact profile downlink [demodulation configuration](https://docs.microsoft.com/en-us/azure/orbital/modem-chain#specifying-a-named-modem-configuration-using-the-api). default: "aqua_direct_broadcast"

Recommend creating a `tcp-to-blob/.env/env-${stage}.sh` to set these and re-load env as needed without risking
committing them to version control.

## Deploy TCP to BLOB and related resources

### Deploy using docker

We have prepared a docker file, `tcp-to-blob/deploy/Dockerfile_deployer`, with all prerequisites needed for deploying.

#### Prerequisites

- [Docker](https://command-not-found.com/docker)

#### Procedure

1. `git clone https://github.com/Azure/azure-orbital-integration.git`
2. `cd azure-orbital-integration/tcp-to-blob`
3. `docker build . -f deploy/Dockerfile_deployer -t orbital-integration-deployer`
4. `NAME_PREFIX=<desired_name_prefix>` Set prefix for names of resources to be deployed.
5. `docker run -it -e NAME_PREFIX="$NAME_PREFIX" orbital-integration-deployer:latest`
6. The command above will bring you to a container shell. In container shell:
   1. `az login`
   2. `az account set -s <your_subscription>`
   3. `git pull`
   4. (optional) Update and source .env/env-template.sh if desired.
      - See Environment Variables section above.
      - You can choose between setting and passing env variables via `docker run -it -e` or running docker then creating and sourcing your env file in the running container.
   5. `./tcp-to-blob/deploy/install-and-deploy.sh`

### Deploy locally or via Azure Cloud Shell

#### Prerequisites

Consider using Bash on [Azure Cloud Shell](https://learn.microsoft.com/en-us/azure/cloud-shell/overview) which meets all prerequisites without the need to install anything on your computer.

- Mac OR Unix-like environment with Bash compatible shell.
- NodeJS LTS (16 or later) - Type `node version` to check version.
- Azure subscription access.
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) - Type `az` or `az -h` for Azure info.
- [AKS CLI](https://docs.microsoft.com/en-us/azure/aks/learn/quick-kubernetes-deploy-cli): `az aks install-cli`. The deployment scripts use [kubectl](https://kubernetes.io/docs/tasks/tools/) (not AKS CLI) but it's probably safest to use the `kubectl` that comes with the AKS CLI.
  - Type `kubectl` for information.
  - If a warning/error shows up that looks like the PATH variable isn't set correctly, [install kubectl](https://kubernetes.io/docs/tasks/tools/).
- (optional) Docker - Type `docker` for information.

#### Procedure

7. `git clone https://github.com/Azure/azure-orbital-integration.git`
8. If using [Azure Cloud Shell](https://learn.microsoft.com/en-us/azure/cloud-shell/overview), you are already logged in. Otherwise, Ensure [logged in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) to Azure CLI and default
   subscription is set.
   1. `az login` (see [docs](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli))
   2. `az account set -s "${SUBSCRIPTION_ID}"` (
      see [docs](https://docs.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli#change-the-active-subscription))
9. From `azure-orbital-integration` directory: `./install-node-modules.sh && npx yarn build`
10. `cd tcp-to-blob`
11. Create `.env/env-<name_prefix>.sh` environment file as described above.
12. `source ./.env/env-<name_prefix>.sh` - It should look like nothing happened in the terminal; this is GOOD.
13. Deploy (to AZ CLI's current subscription): `./deploy/bicep/deploy.sh` If you receive an 'Authorization failed' error, you may not have proper access to the subscription.
14. Update generated contact profile if desired. Defaults to Aqua with "aqua_direct_broadcast" named demodulation configuration.
    1. Open Azure Portal and navigate to Orbital Service.
    2. Navigate to Contact Profiles (left-side panel).
    3. Select the generated contact profile (default name is `${NAME_PREFIX}-aks-cp`).

### Advanced deployment

If you wish to utilize an existing ACR and Storage container:

1. Update your `.env/env-<name_prefix>.sh` to include:
   - ACR info: `ACR_NAME` and `ACR_RESOURCE_GROUP`
   - Storage account info: `CONTACT_DATA_STORAGE_ACCT`, `CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP` and optionally `CONTACT_DATA_STORAGE_CONNECTION_STRING` (consider SAS connection string).
   - Resource group for other generated resources: `AZ_RESOURCE_GROUP`
2. `./deploy/bicep/deploy-core.sh && ./deploy/az-cli/deploy-service-and-dashboards.sh`

- Note: An Azure CLI `deploy.sh` script is available in `./deploy/az-cli` for reference. However, the `./deploy/bicep` scripts are the most up-to-date and complete deployment mechanism.

## Login/switch environments

1. Ensure [logged in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) to Azure CLI.
2. Open a new bash-like terminal shell.
3. `. .env/env-<name_prefix>.sh && npx yarn az-login && . ./deploy/env-defaults.sh`

# Send _text data_ to TCP to BLOB endpoint

1. Ensure docker is running.
2. Login/switch environments (once every few hours or per env session).
3. `npx yarn run-text-canary`
4. View AKS logs as described below.
5. Verify BLOB matching `filename` was created in your storage container.

### Set up ongoing _text data_ heartbeat testing TCP to Blob endpoint

1. Ensure docker is running
2. Login/switch environments (once every few hours or per env session).
3. `npx yarn deploy-text-canary-cron`
4. View AKS logs as described below.

### Send _raw contact data_ to TCP to BLOB endpoint for testing

1. See `RAW_DATA_BLOB_NAME` env variable above to make raw data available for canary to read and stream to TCP to BLOB.
2. Ensure docker is running.
3. Login/switch environments (once every few hours or per env session).
4. Run `npx yarn docker-push-raw-canary` to push the image `tcp-to-blob-raw-canary` to ACR.
5. `npx yarn run-raw-canary`
6. View AKS logs as described below.
7. Verify BLOB matching `filename` was created in your storage container.

### Set up ongoing _raw contact data_ heartbeat testing TCP to Blob endpoint

1. See `RAW_DATA_BLOB_NAME` env variable above to make raw data available for canary to read and steam to TCP to BLOB.
2. Ensure docker is running
3. Login/switch environments (once every few hours or per env session).
4. `npx yarn deploy-raw-canary-cron`
5. View AKS logs as described below.

## Run service locally _without_ containers

1. Login/switch environments (once every few hours or per env session).
2. `cd tcp-to-blob`
3. `node ./dist/src/tcp-to-blob.js`

## Run service locally with Docker

1. Ensure docker is running.
2. Login/switch environments (once every few hours or per env session).
3. Build image: `npx yarn docker-build`
4. Start container: `npx yarn docker-run`

## Stop local docker service

1. `docker ps` Note of Container ID.
2. `docker kill <Conatiner ID>`

Or run `npx yarn docker-kill-all` (instead of 1 & 2)

## View TCP to BLOB Shared Dashboard

1. Login to [Azure Portal](https://portal.azure.com/).
2. Select the tenant where TCP to BLOB is deployed.
3. Either navigate to Shared Dashboards or to your resource group (`AZ_RESOURCE_GROUP`).
4. Open the dashboard named `${NAME_PREFIX}-dashboard`.
5. Click 'go to dashboard'

## View AKS logs

1. Navigate to your service in AKS portal.
2. Click on the "Logs" link on the left-hand menu.
3. Click "Container Logs" and then "Run" or "Load to Editor" within the "Find a value in Container Logs Table" card.

**Filter recent activity:**

```
let FindString = "";
ContainerLog
| where LogEntry has FindString
// | where not(LogEntry has "No socket data.")
| extend _data = parse_json(LogEntry)
| where not(_data.event == "socket-data")
| sort by TimeGenerated desc
| extend senderIP = tostring(_data.remoteHost)
| extend sender=tostring(case(senderIP startswith "10.241", "canary", senderIP startswith "10.244", "orbital", "unknown"))
| project TimeGenerated, senderIP, sender, subsystem=tostring(_data.subsystem), event=tostring(_data.event), message=tostring(_data.message), filename=tostring(_data.filename), mb=todouble(_data.fileSizeInKB)/1000, seconds=todouble(_data.durationInSeconds), containerName=tostring(_data.containerName), error=tostring(_data.error)
// | where event == "complete"
// | where subsystem == "tcp-to-blob"
// | where subsystem == "tcp-to-blob-text-canary"
// | where TimeGenerated between((approxTime - timeOffset) .. (approxTime + timeOffset))
```

**View recently completed BLOBs:**

```
ContainerLog
| where LogEntry has FindString
| extend _data = parse_json(LogEntry)
| sort by TimeGenerated desc
| extend senderIP = tostring(_data.remoteHost)
| extend sender=tostring(case(senderIP startswith "10.241", "canary", senderIP startswith "10.244", "orbital", "unknown"))
| project TimeGenerated, senderIP, sender, subsystem=tostring(_data.subsystem), event=tostring(_data.event), message=tostring(_data.message), filename=tostring(_data.filename), mb=todouble(_data.fileSizeInKB)/1000, seconds=todouble(_data.durationInSeconds), containerName=tostring(_data.containerName), error=tostring(_data.error)
| where event == "complete"
| where subsystem == "tcp-to-blob"\
```

**View activity around the time of a contact:**

```
let approxTime = todatetime('2022-07-15T02:34:11.969Z');
let timeOffset = 2m;
ContainerLog
| extend _data = parse_json(LogEntry)
| where not(_data.event == "socket-data")
| sort by TimeGenerated desc
| extend senderIP = tostring(_data.remoteHost)
| extend sender=tostring(case(senderIP startswith "10.241", "canary", senderIP startswith "10.244", "orbital", "unknown"))
| project TimeGenerated, senderIP, sender, subsystem=tostring(_data.subsystem), event=tostring(_data.event), message=tostring(_data.message), filename=tostring(_data.filename), mb=todouble(_data.fileSizeInKB)/1000, seconds=todouble(_data.durationInSeconds), containerName=tostring(_data.containerName), error=tostring(_data.error)
// | where event == "complete"
// | where subsystem == "tcp-to-blob"
// | where subsystem == "tcp-to-blob-text-canary"
// | where filename == FindString
| where TimeGenerated between((approxTime - timeOffset) .. (approxTime + timeOffset))
```

## Delete AKS workload and service

`kubectl delete -f ./dist/env/${NAME_PREFIX}/tcp-to-blob.yaml`

## Pipeline deployment via Bicep

### Summary

This deployment guide is a work in progress on deploying everything necessary for tcp-to-blob to run properly in Azure
from ADO pipelines.

There are two pipelines in this approach and currently one manual step. The manual step is creating a service
connection (SC) for the Azure Container Registry (ACR). The ACR must be created before the SC is created. Another step
that could be a manual process is making sure the service connection principal has the owner role assigned at the
subscription level (details below) the build agent will conduct all operations under the context of this service
principal.

After the prereq pipeline has successfully deployed and a SC has been created the azure-pipeline can be run. This
pipeline creates Azure Kubernetes Service (AKS), installs dependencies, builds the tcp-to-blob project, builds the
docker image and pushes the image to our ACR created in step 1.

### Deploy process.

1. Create Azure Resource Manager Service Connection and assign ownership role at the subscription level. Check with your
   ADO administrator to see if this is already created as it is not visible for all users.

   - Please see the
     following [documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml)
     for creating the service connection.
   - Please see the
     following [documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#assign-a-role-to-the-application)
     regarding assigning role to a service principal. This will be the service principal that the build agent is using.

2. Create a variable group that your pipeline can reference. This var group sets environment variables for different
   build steps. Values needed:

   - For ease name the variable group **tcp-to-blob-vg**. This is the name the build yaml files are expecting.
   - ### sample variables:
     - `ACR_NAME: $(ORG_NAME)$(AZ_LOCATION)acr`
     - `CONTACT_DATA_STORAGE_ACCT: $(ORG_NAME)$(AZ_LOCATION)`
     - `CONTACT_DATA_STORAGE_CONNECTION_STRING_SECRET_KEY: $(ORG_NAME)-$(AZ_LOCATION)-storage`
     - `AZ_LOCATION: westus2`
     - `AZ_RESOURCE_GROUP: $(ORG_NAME)-test`
     - `AZ_SUBSCRIPTION: {This is the name of the Azure Resource Manager Service Connection created in step 1}`
     - `NAME_PREFIX: $(ORG_NAME)-$(AZ_LOCATION)`
     - `ORG_NAME: aoi`

3. Create and/or run pipeline pointing to azure-resources/prereq-tcp-to-blob/prereq-azure-pipeline.yml

4. Create New Docker Registry Service Connection to correspond to the newly created ACR name it aoi-acr-sc for the
   pipeline script to reference properly.

5. Create and/or run pipeline pointing to ./azure-pipelines.yml
   - First run of the pipeline you will need to grant permission for your service connection
   - If this pipeline has been previously ran and resources exist another run will fail because the role assignment
     already exists. If another run is needed first delete the aoi-westus2-aks-agentpool acr pull role assignment.

## License

Copyright &copy; 2022 Microsoft. This Software is licensed under the MIT License. See [LICENSE](./LICENSE) in the project root for more information.
