# Example Aqua Processor
Aqua Processor deploys an Azure VM (processor VM) for processing data stored in Azure Blob Storage. As an example, this readme includes instructions for installing and running [NASA DRL](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=325&type=software) tools [RT-STPS](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=69) and [IPOPP](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=68) on the processor VM to process Aqua data fetched from Azure Blob Storage. For processing data from other satellites, you can replace the NASA DRL tools with the spacecraft instrumentation specific processing tools.  

## Prerequisites
The [tcp-to-blob](/tcp-to-blob) component must be deployed before deploying the Aqua Processor.

Install the following on your local machine before proceeding:
* [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/)
* [jq](https://stedolan.github.io/jq/download/)
* [envsubst](https://command-not-found.com/envsubst)
* [.NET 6.0 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/6.0)

## Deployment Steps 
### Configure environment
The [env-template](deploy/env-template.sh) file contains the configuration parameters needed for this deployment. It is recommended to copy this file to a folder named `.env`. The `.env` folder is part of gitignore so any sensitive information in it won't get accidently checked in to any repository.

```
cd examples/aqua-processor
mkdir -p ./.env
cp ./deploy/env-template.sh ./.env/env-template.sh
```
Set the following **REQUIRED** parameters in your `.env/env-template.sh` file:
- AZ_LOCATION: Region where the resources will be deployed.
- NAME_PREFIX: Prefix for generating names for resources to prevent conflict between multiple deployments. Please limit to 11 characters or less. 
- ALLOWED_SSH_IP_ADDRESS: Source IP address that you will be connecting to the processor VM from. This would normally be the public IP of your local machine.
- CONTACT_STORAGE_ACCOUNT_NAME: The storage account from the [tcp-to-blob](/tcp-to-blob) deployment.
- CONTACT_STORAGE_ACCOUNT_RESOURCE_GROUP: Resource group name for contact storage account.
- SERVICE_BUS_NAMESPACE: Service bus namespace from the [tcp-to-blob](/tcp-to-blob) deployment.
- SERVICE_BUS_RESOURCE_GROUP: Resource group name for the service bus namespace.

Optional parameters:
- SERVICE_BUS_AUTH_RULE_NAME: By default we use the system provided auth rule name. If needed you can create your own and update this variable.
- FILE_EVENT_SERVICE_ENVIRONMENT_NAME: Used to name the instance of FileEventService for log parsing.
- AZ_VM_USER_HOME_FOLDER: Used to specify the home folder path on the processor VM.
- SERVICE_BUS_QUEUE_NAME: The queue where Event Grid sends the blob created events when new contact data is written to blob store.
- RTSTPS_OUTPUT_CONATINER_NAME: The container where `RT-STPS` output data is stored.
- RTSTPS_OUTPUT_SUBFOLDER_PATH: The subfolder path within the `RTSTPS_OUTPUT_CONATINER_NAME` where RT-STPS data is stored.
- MODIS_OUTPUT_CONTAINER_NAME: The container where `modis` output data is stored
- LEVEL0_OUTPUT_SUBFOLDER_PATH: The subfolder path within the `MODIS_OUTPUT_CONTAINER_NAME` where `level0` data is stored.
- LEVEL1_OUTPUT_SUBFOLDER_PATH: The subfolder path within the `MODIS_OUTPUT_CONTAINER_NAME` where `level1` data is stored.
- LEVEL2_OUTPUT_SUBFOLDER_PATH: The subfolder path within the `MODIS_OUTPUT_CONTAINER_NAME` where `level2` data is stored.
- LEVEL1_ALT1_OUTPUT_SUBFOLDER_PATH: The subfolder path within the `MODIS_OUTPUT_CONTAINER_NAME` where `level1-alt1` data is stored.
- LEVEL2_ALT1_OUTPUT_SUBFOLDER_PATH: The subfolder path within the `MODIS_OUTPUT_CONTAINER_NAME` where `level2-alt1` data is stored.

### Deploy
Deploy from your local machine (requires an ssh client).

[Login using Azure CLI](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) and set your default subscription: 
```
az login
az account set -s "{YOUR_SUBSCRIPTION_ID}"
```
Create an SSH key pair on your local machine:
```
ssh-keygen -t rsa
```
This will generate an ssh key pair in the ~/.ssh directory of your local machine. 

Initiate the deployment script:
```
cd examples/aqua-processor
source ./.env/env-template.sh`
./deploy/deploy.sh
```
- Note: This will deploy the processor VM, and by default, the SKU size will be `Standard D16ads v5 (16 vcpus, 64 GiB memory)`. If you choose to deploy a smaller-sized VM, you may run into memory related issues during IPOPP ingestion. If the deployment cannot provision this VM SKU due to reaching the quota limit for that region in the subscription, select another region or contact your subscription admin to increase the Total Regional vCPUs or increase the specific SKU quota. 

The deployed processor VM is named `aoi-aqua-vm` based on a NAME_PREFIX chosen for illustration. Depending on the prefix you choose, the VM will be deployed with the name `{NAME_PREFIX}-vm`.

## Install NASA DRL tools

To install NASA DRL tools, we first need to add support for GUI applications by installing desktop tools and a VNC server on `aoi-aqua-vm` to remotely run GUI applications. These pre requisites are installed by the deploy script and you can directly go ahead and start the VNC server. If you are deploying the VM manually, then follow the below installation steps.

### Install Desktop and VNC Server
Please note that initial ssh authentication will only work from your local machine because the deployment script run in the previous step uses your local public key (id_rsa.pub) to set up passwordless authentication to the processor VM. 

After logging on from your local machine, you can add public keys to the ~/.ssh/authorized_keys file on the processor VM to allow authentication from different machines.  

Install desktop tools and vncserver on the `aoi-aqua-vm`.
```
sudo yum install tigervnc-server
sudo yum groups install "GNOME Desktop"
```
Start VNC server:
 ```
 vncsever
 ```
 Enter a password when prompted.

### Remotely access the VM Desktop

 Port forward the vncserver port (5901) over SSH to your local machine:
 ```
 ssh -L 5901:localhost:5901 azureuser@aoi-aqua-vm
 ```
 On your local machine, download and install [TightVNC Viewer](https://www.tightvnc.com/download.php). Start the TightVNC Viewer and connect to ```localhost:5901```. Enter the vncserver password you entered in the previous step. You should see the GNOME Desktop running on the VM.

### Download RT-STPS and IPOPP installation files
From the GNOME Desktop, go to **Applications** > **Internet** > **Firefox** to start a browser. 

Log on to the [NASA DRL](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=325&type=software) website and download the RT-STPS installation files and the IPOPP downloader script under software downloads. The downloaded file will land under ~/Downloads.

### Install RT-STPS:
```
tar -xvzf ~/Downloads/RT-STPS_7.0.tar.gz --directory ~/
tar -xvzf ~/Downloads/RT-STPS_7.0_testdata.tar.gz --directory ~/
cd ~/rt-stps
./install.sh
```

Validate your RT-STPS install by processing the test data supplied with the installation:
```
cd ~/rt-stps
./bin/batch.sh config/jpss1.xml ./testdata/input/rt-stps_jpss1_testdata.dat
```
Verify that output files exist in the data folder:
```
ls -la ~/data/
```

This completes the RT-STPS installation.

### Install IPOPP
Run the downloader script to download the IPOPP installation files. 
```
cd ~/Downloads
./downloader_DRL-IPOPP_4.1.sh
tar -xvzf ~/Downloads/DRL-IPOPP_4.1.tar.gz --directory ~/
cd ~/IPOPP
./install_ipopp.sh
```

### Configure and start IPOPP services
IPOPP services are configured using its Dashboard GUI.

[Go to the VM Desktop](#remotely-access-the-vm-desktop) and start a new terminal under **Applications** > **Utilities** > **Terminal** 
Start the IPOPP dashboard from the terminal:
```
~/drl/tools/dashboard.sh
```

IPOPP starts in the process monitoring mode. Switch to **Configuration Mode** by the using the menu option. 

Enable the following under the **EOS** tab:
* gbad
* MODISL1DB l0l1aqua 
* MODISL1DB l1atob 
* IMAPP

Switch back to **Process Monitoring** mode using the menu option. 

Start IPOPP services:
```
~/drl/tools/services.sh start
~/drl/tools/services.sh status
```

This completes the IPOPP installation and configuration. 

### Level1 & Level2 products

After installing IPOPP it produces Level0 data, however for Level1 & Level2 data, log on to the [NASA DRL](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=325&type=software) website, download `BURNSCAR_SPA` and follow **Appendix E** in [IPOPP_4.1_Users_Guide.pdf](https://directreadout.sci.gsfc.nasa.gov/links/rsd_eosdb/PDF/IPOPP_4.1_Users_Guide.pdf) to install the SPA into the IPOPP framework. If there are any patches, install them too. 

Installation of this SPA into the IPOPP framework produces Level1 & Level2 data. 

## Enable FileEventService.service

The FileEventService.service provides event driven processing of contact data files as they are downloaded using FileEventService. Once RT-STPS and IPOPP are installed and configured, you can enable and start the service and as soon as contact data starts to land on the aqua-processor VM, FileEventService will pick up the new file and automatically trigger RT-STPS and IPOPP processing tools [See FileEventService for more details](../../file-event-service/README.md). The service will automatically export any logs output by RT-STPS and IPOPP and land in Log Analytics Workspace.

- Enable the service: `sudo systemctl enable FileEventService.service`
- Start the service: `sudo systemctl start FileEventService.service`

Once this service is enabled, Aqua data files will be automatically processed by RT-STPS and IPOPP and any output will be stored in the storage account that was created during the [tcp-to-blob](../../tcp-to-blob/README.md) deployment.

## Monitoring IPOPP
Every station that is enabled on IPOPP also produces logs and you can use the same steps to configure the logs to be sent to a local logger and utilize the data using log analytics.

For more information about monitoring, refer to Appendix F in the IPOPP user's guide.

## Get IPOPP output files from the logs
`SPAruntime.sh` processes a station.stationlog file, finds each execution of the SPA service, and prints how long the SPA service took to create each set of outputs. 

Copy the `ipopp_log.sh` to your home directory and run the following command if you want to collect all the output files from each SPA and send to Azure Monitor:
```
find /ipopp/drl/ncs/stations/ -name \*.stationlog -exec ~/ipopp_log.sh {} \; | logger -s -p local1.info
```

Run the following query on Azure Monitor will present you all the output file names and elapsed time for each SPA.
```
Syslog
| where Computer == "ipoppvm"
| where Facility == "local1"
| where SyslogMessage contains "Outputs"
| parse-where SyslogMessage with "SPA: /ipopp/drl/ncs/stations/" SPAName "/station.stationlog Outputs:  " OutputFiles " Elapsed time: " ElapsedTime
| project SPAName, OutputFiles=split(OutputFiles, ' '), ElapsedTime
```

## License

Copyright &copy; 2022 Microsoft. This Software is licensed under the MIT License. See [LICENSE](./LICENSE) in the project root for more information.
