<!---
  Copyright (c) 2022 Microsoft Corporation. All rights reserved.
  Software is licensed under the MIT License. See LICENSE in the project
  root for license information.
-->

# TCP to BLOB

Script/docker container/Azure Kubernetes service that listens on a TCP port and writes contents to a BLOB in the
configured Azure storage container.

## Event lifecycle

1. `server-init`: Server starting up.
2. `socket-connect`: Client socket connected to server. (1 per socket)
3. `cleanup`: Purge un-needed resources. (`<n>` per socket)
4. `socket-data`: Process client data sent to socket. (`<n>` per socket)
5. `socket-error`: Error prior to completion. Terminates socket and initiates `socket-close` event. (0 or 1 per socket)
6. `socket-close`: All data has been received and written to file if applicable. Attempt uploading to BLOB. (1 per
   socket)
7. `complete`: Final event providing success/failure summary. (1 per socket)

## Prerequisites

* NodeJS LTS (16 or later)
* [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) (recommended) You can use `npm`, but README
  uses `yarn`
* Azure subscription access
* Azure CLI
* Docker

## Install NodeJS dependencies

`yarn install`

## New to NodeJS?

A NodeJS project is defined by [package.json](package.json).

When you run `yarn <cmd>` (or alternatively `npm run <cmd>`), `yarn`/`npm` finds the <cmd> in the `scripts` of
package.json to determine what script are available.

If for some reason you prefer to not run the with `yarn` or `npm`, you can consider the `scripts` in package.json as
examples.

## Environment variables

Required:

* `AZ_LOCATION` e.g. "westus2"
* `NAME_PREFIX`: Used to make name for resources to create. e.g AKS cluster, vnet, etc.

Optional:

* `AZ_RESOURCE_GROUP`: Resource group containing your AKS service.
* `ACR_NAME`: Name of your Azure Container Registry.
* `CONTACT_DATA_STORAGE_ACCT`: Name of storage account where BLOBs will be created (containing data sent to TCP
  endpoint).
* `CONTACT_DATA_STORAGE_CONTAINER`: Name of storage container for saving BLOBs.
  default: `"tcp-to-blob-output-${NAME_PREFIX}"`
* `CONTACT_DATA_STORAGE_CONNECTION_STRING`: (**Sensitive**) Storage
  BLOB [connection string](https://docs.microsoft.com/en-us/azure/storage/common/storage-configure-connection-string).
    * Via AZ
      CLI: `CONTACT_DATA_STORAGE_CONNECTION_STRING=$(az storage account show-connection-string --resource-group "${CONTACT_DATA_STORAGE_ACCT_RESOURCE_GROUP}" -n "${CONTACT_DATA_STORAGE_ACCT}" --query "connectionString" -otsv)`
    * Via Azure Portal
        1. Navigate to Azure Storage Account portal.
        2. Select the storage account where you want to write BLOBs.
        3. Open the "Access Keys" tab.
        4. Click the "Show" button to display Connection string.
        5. Copy the connection string into your clipboard.
        6. `export CONTACT_DATA_STORAGE_CONNECTION_STRING="<pasted_value>"`
* `AKS_VNET`: default: `"${AKS_CLUSTER_NAME}-vnet"`
* `AKS_NUM_REPLICAS`: default: 2
* `HOST`: default: "0.0.0.0".
* `PORT`: default: 50111
* `SOCKET_TIMEOUT_SECONDS`: default: 60
* `NUM_BLOCK_LOG_FREQUENCY`: default: 4000
* `SOCKET_TIMEOUT_SECONDS`: Seconds of socket inactivity until socket is destroyed. default: 60
* `AKS_VNET_ADDR_PREFIX`: default: "10.0.0.0/8"
* `AKS_VNET_SUBNET_ADDR_PREFIX`: Subnet for AKS nodes. default: "10.240.0.0/16"
* `LB_IP`: IP address for the internal load balancer Orbital will hit. Should be in vnet IP range. default: "
  10.240.11.11"
* `AKS_POD_SUBNET_ADDR_PREFIX`: Subnet for AKS pods. default:  "10.241.0.0/16"
* `AKS_ORBITAL_SUBNET_ADDR_PREFIX`: Subnet delegated to Orbital. default:  "10.244.0.0/16"
* `CANARY_NUM_LINES`: Number of lines of text canary will send to TCP to BLOB. default: 65000

Recommend creating a `tcp-to-blob/.env/env-${stage}.sh` to set these and re-load env as needed without risking
committing them to version control.

## Create environment file

1. `cd tcp-to-blob && mkdir .env`
2. `cp ./deploy/env-sample.sh .env/env-<name_prefix>.sh`
3. Edit your env file as needed. See: "Environment variables" section above.

# Deploy environment to Azure Kubernetes Service (AKS)

requires: Unix-like environment or Mac

1. Ensure [logged in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) to Azure CLI and default
   subscription is set.
    1. `az login` (see [docs](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli))
    2. `az account set -s "${SUBSCRIPTION_ID}"` (
       see [docs](https://docs.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli#change-the-active-subscription))
2. Ensure docker is running.
3. `cd tcp-to-blob`
4. Create `.env/env-<name_prefix>.sh` environment file as described above.
5. `. .env/env-<name_prefix>.sh`
6. Deploy (to AZ CLI's current subscription):
    * With AZ CLI: `./deploy/az-cli/deploy.sh`  or
    * With Bicep: `./deploy/bicep/deploy.sh`

## Login/switch environments

1. Ensure [logged in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) to Azure CLI.
2. Open a new bash-like terminal shell.
3. `. .env/env-<name_prefix>.sh && yarn az-login && . ./deploy/env-defaults.sh`

# Send test data to TCP to BLOB endpoint

1. Ensure docker is running.
2. Login/switch environments (once every few hours or per env session).
3. `yarn run-canary`
4. View AKS logs as described below.
5. Verify BLOB matching `filename` was created in your storage container.

**Hint:** Run this if you see an error "unauthorized: authentication required".

## Run service locally *without* containers

1. Login/switch environments (once every few hours or per env session).
2. `cd tcp-to-blob`
3. `yarn install`
4. `yarn compile-watch`
5. `node ./dist/tcp-to-blob.js`

## Run service locally with Docker

1. Ensure docker is running.
2. Login/switch environments (once every few hours or per env session).
3. `yarn install`
4. Build image: `yarn docker-build`
5. Start container: `yarn docker-run`

## Stop local docker service

1. `docker ps` Note of Container ID.
2. `docker kill <Conatiner ID>`

Or run `yarn docker-kill-all` (instead of 1 & 2)

## View AKS logs

1. Navigate to your service in AKS portal.
2. Click on the "Logs" link on the left-hand menu.
3. Click "Container Logs" and then "Run" or "Load to Editor" within the "Find a value in Container Logs Table" card.

**Filter recent activity:**

```
let FindString = "<filter-term-here>";
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
// | where subsystem == "tcp-to-blob-canary"
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
// | where subsystem == "tcp-to-blob-canary"
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
   