# Aqua Processor
Aqua Processor deploys an Azure VM (`aoi-aqua-vm`) for processing Aqua data stored in Azure Blob Storage. This readme includes instructions for installing and running [NASA DRL](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=325&type=software) tools [RT-STPS](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=69) and [IPOPP](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=68) on the `aoi-aqua-vm` to process Aqua data fetched from Azure Blob Storage.

## Prerequisites
The [tcp-to-blob](/tcp-to-blob) component must be deployed before deploying the Aqua Processor.

Install the following on your local machine before proceeding:
* [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/)
* [jq](https://stedolan.github.io/jq/download/)
* [envsubst](https://command-not-found.com/envsubst)
* [.NET 6.0 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/6.0)

## Deployment Steps 
### Configure environment
The [env_template](deploy/env-template.sh) file contains the configuration parameters needed for this deployment. It is recommended to copy this file to a folder named `.env`. The `.env` folder is part of gitignore so any sensitive information in it won't get accidently checked in to any repository.

```
cd aqua-processor
mkdir -p ./.env
cp ./deploy/env-template.sh ./.env/env-template.sh
```
Set the following parameters in your `.env/env-template.sh` file:
* AZ_LOCATION: Region where the resources will be deployed.
* NAME_PREFIX: Prefix for generating names for resources to prevent conflict between multiple deployments. Please limit to 11 characters or less. 
* ALLOWED_SSH_IP_ADDRESS: Source IP address that you will be connecting to the `aoi-aqua-vm` from.
* CONTACT_STORAGE_ACCOUNT_NAME: Storage the storage account from the [tcp-to-blob](/tcp-to-blob) deployment.
* CONTACT_STORAGE_ACCOUNT_RESOURCE_GROUP: Resource group name for contact storage account.
* SERVICE_BUS_NAMESPACE: Service bus namespace from the [tcp-to-blob](/tcp-to-blob) deployment.
* SERVICE_BUS_RESOURCE_GROUP: Resource group name for the service bus namespace.

### Deploy
Deploy from your local machine (requires an ssh client).

[Login using Azure CLI](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) and set your default subscription: 
```
az login
az account set -s "{YOUR_SUBSCRIPTION_ID}"
```
Initiate the deployment script:
```
cd aqua-processor
source ./.env/env-template.sh`
./deploy/deploy.sh
```

This will deploy the Aqua Processor VM. 

## Install NASA DRL tools

To install NASA DRL tools, we first need to add support for GUI applications by installing desktop tools and a VNC server on `aoi-aqua-vm` to remotely run GUI applications. 

### Install Desktop and VNC Server
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
Go to **Applications** > **Internet** > **Firefox** to start a browser. 

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
Run the dowloader script to download the IPOPP installation files. 
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

Swith back to **Process Monitoring** mode using the menu option. 

Start IPOPP services:
```
~/drl/tools/services.sh start
~/drl/tools/services.sh status
```

This completes the IPOPP installation and configuration. 

## Enable INotifyRTSTPS Service

The INotifyRTSTPS service provides event driven processing of contact data files as they are downloaded using the BlobDownloadService. Once RT-STPS is installed, you can enable and start the service and as soon as contact data starts to land on the aqua-processor VM, [inotifywait](https://linux.die.net/man/1/inotifywait) will pick up the new file and automatically trigger RT-STPS. The service will automatically export any logs output by RT-STPS and land in Log Analytics Workspace.

- Enable the service: `sudo systemctl enable INotifyRTSTPS.service`
- Start the service: `sudo systemctl start INotifyRTSTPS.service`

Once this service is enabled, Aqua data files will be automatically processed by RT-STPS as soon as they are written to local disk at `~/blobdata` by the BlobDownloadService.

## Run IPOPP ingest 
RT-STPS writes its output to the `~/data` folder as `PDS` files. Copy these files to the IPOPP landing zone and start the ingest:
```
cp ~/data/* ~/drl/data/dsm/ingest/.
~/drl/tools/ingest_ipopp.sh
```
IPOPP writes its output to the `~/drl/data/pub/gsfcdata/aqua/modis` directory.

To persist the processed data in Azure Blob Storage, upload it from the above directory to a container using [AzCopy](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10). 

## Monitoring IPOPP
Adding the CRON job below will export data from IPOPP logs to system logs and based on our bicep configuration, the data from a VM's local logs should show up in log analytics.

Here's a sample cron to collect metrics every 5 minutes:
```
*/5 * * * * /datadrive/ipopp/drl/nsls/bin/print-logs.sh -startdate `date --date="5 minutes ago" +"%Y-%m-%dT%H:%M:%S"` | logger -p local1.info
```

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