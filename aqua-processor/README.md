# RT-STPS
RT-STPS will be used to process raw binary files from satellites and have PDS files as output.
More information about RT-STPS can be found on this link - [NASA DRL](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=69)

# IPOPP 
IPOPP will be used to process pds files from satellites and have tif/hdf files as output.
More information about IPOPP can be found on this link - [NASA DRL](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=68)

Both processes RT-STPS and IPOPP installed and supported by a single VM instance. 

## Prerequisites
* Azure subscription access
* Azure CLI

## Create Environment File
In the root of the central-logging folder, there is a file named `env-sample.sh`. It is recommended to copy this file to a folder named `.env`. the `.env` folder is part of gitignore so any sensitive information that is in that folder won't accidentally get checked in to any repositories.

In the following steps, we will assume that you keep the name of `env-sample.sh`. You are free to adjust as you see fit.

1. Change directory to aqua-processor `cd aqua-processor`
2. Make the .env folder `mkdir -p ./.env`
3. Copy the sample env file `cp ./env-sample.sh ./.env/env-sample.sh`
4. Edit `./.env/env-sample.sh`
  * NAME_PREFIX: Used as a prefix pattern for generating resource group and resources. Something short simple and descriptive is ideal.
  * LOCATION: The location where the resources will be deployed.
  * ALLOWED_SSH_IP_ADDRESS: This is the public IP address that you will be connecting to the Aqua processor VM from.

## Deploy
requires: Unix-like environment or Mac
1. Ensure [logged in](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli) to Azure CLI and default subscription is set. 
   1. `az login` (see [docs](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli))
   2. `az account set -s "${SUBSCRIPTION_ID}"` (see [docs](https://docs.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli#change-the-active-subscription))
2. Change directory `cd aqua-processor`
3. Source your environment file `. ./.env/env-sample.sh`
4. Run deploy `./deploy/deploy.sh`

## Install dependencies
in the roo of ./aqua-processor/deploy, there is a file called cloud-init.yaml. If you need to add any other dependencies to your VM, you can call them out here. See [Documentation](https://docs.microsoft.com/en-us/azure/virtual-machines/linux/cloud-init-deep-dive) for details.

## Install RT-STPS
To install RT-STPS, follow these instructions:
- Download the installation files from NASA drl https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=263&type=software, you may need to create an account and wait for approval before you can download.
- Copy the downloaded installation files to the desired installation directory
You can use the following command to secure copy the files from downloads to the VM

```
scp RT-STPS_6.0*.tar.gz <adminusername>@<vm public ip>:.
```

- Install RT-STPS using the commands:

```
# Decompress RT-STPS_6.0.tar.gz
tar -xzvf RT-STPS_6.0.tar.gz
# Change to the rt-stps directory
cd rt-stps/
./install.sh

# Install patches
cd ..
tar -xzvf RT-STPS_6.0_PATCH_1.tar.gz
tar -xzvf RT-STPS_6.0_PATCH_2.tar.gz
tar -xzvf RT-STPS_6.0_PATCH_3.tar.gz

cd rt-stps/
./install.sh

# Validate with test file
cd ..
tar -xzvf RT-STPS_6.0_testdata.tar.gz
# empty data directory
rm data/*
cd rt-stps/

./bin/batch.sh config/npp.xml testdata/input/rt-stps_npp_testdata.dat
# verify that output files exist
ls -la ../data/ 

```
## Monitor RT-STPS
You can use `logger` to write rt-stps logs to system log and the agent will automatically collect syslogs. Syslogs will show up in the Log Analytics Workspace.
Here is an example:

```
logger -p local0.info -f /logs/rtstps.log -t $(uuidgen)
```

## Automatically run RT-STPS everyday
Assuming the raw input files are stored in a storage container and the rt-stps vm has access to the storage container via a user assigned managed identity, we can use `run_rtstps.sh` to run rt-stps on a random file.

`run_rtstps.sh` randomly copies an input file from the raw binary data container and run RT-STPS program against that file. RT-STPS logs will be collected by syslog and show up in the Log Analytics Workspace.

Remember to add the url of the source blob and clientID of your user-assigned managed identity as environment variables.
You can create a cron job to run the script at 9am everyday, here is an example:
```
0 9 * * * env UAMI_CLIENT_ID=<the client id of your user-assigned managed identity>\
              INPUT_CONTAINER_URL=<url of your storage account container which contains the raw binary files> \ 
              bash /home/<admin user name>/run_rtstps.sh
```

## Install IPOPP
Sign up on NASA's DRL to download a copy of [IPOPP](https://directreadout.sci.gsfc.nasa.gov/?id=dspContent&cid=68)
Follow the instructions on the [user's guide](https://directreadout.sci.gsfc.nasa.gov/links/rsd_eosdb/PDF/IPOPP_4.1_Users_Guide.pdf) to install IPOPP.

## Install SPA
Additional SPAs can be installed on IPOPP to generate more data from the raw satellite input feed. Refer Appendix E in the IPOPP user guide for more information.

## Monitoring IPOPP
We recommend adding a cron job to export data from IPOPP logs to system logs and based on our bicep configuration, the data from a VM's local logs should show up in log analytics.

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