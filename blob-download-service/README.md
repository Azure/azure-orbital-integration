# BlobDownloadService
BlobDownloadService is an event driven tool that listens for storage events on Event Grid using Event Hubs or Service Bus. Once an event is received, the recently created blob will be downloaded to a configured folder on the local file system.

# Integration with aqua-processor
BlobDownloadService runs as a systemd service on the aqua processor VM. It retrieves new contact data for RT-STPS to process. Once contact data is written to blob using the tcp-to-blob component, an Event Grid alert is sent and BlobDownloadService receives that event via Service Bus. The blob is then downloaded to the users home directory under the `~/blobdata` folder.

During deployment of the aqua-processor component, we leverage a predefined `appsettings.template.json` file under `aqua-processor/deploy/blob-download-service` and use envsubst to replace tokens in the template with the appropriate values. This file is then packaged up and sent to blob store where it will get downloaded and used by the VM deployment.

# BlobDownloadService configuration
BlobDownloadService supports receiving Event Grid messages from Service Bus or Event Hubs. You can configure as many Service Bus and/or Event Hub connections as required.
## Blob Download Options
```json
"blobDownloadOptions": {
    "environmentName": "blob-download-service",
    "serviceBusReceivers": [],
    "eventHubReceivers": []
}
```
|Property|Description|
|-|-|
|environmentName|A unique name that would distinguish one BlobDownloadService instance from another. This name is helpful for parsing logs.|
|serviceBusReceivers|A collection of `serviceBusReceivers` that Event Grid messages will be received from. [See Service Bus Receiver](#service-bus-receiver)|
|eventHubReceivers|A collection of `eventHubReceivers` that Event Grid messages will be received from. [See Event Hub Receiver](#event-hub-receiver)|

## Service Bus Receiver
Provides functionality to receive Event Grid messages from Service Bus, specifically Azure Storage Event Grid messages.

`Documentation:` [Azure Service Bus](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview)
```json
{
    "receiverName": "string",
    "serviceBusConnectionString": "string",
    "serviceBusQueueName": "string",
    "blobConnectionString": "string",
    "localBlobDownloadPath": "string",
    "allowedEventTypes": []
}
```
|Property|Description|
|-|-|
|receiverName|A unique name that would help distinguish one receiver from another. This name is helpful for parsing logs.|
|serviceBusConnectionString|The connection string used for authenticating with Service Bus.|
|serviceBusQueueName|The Service Bus queue name where messages are received.|
|blobConnectionString|The connection string used for authenticating to the storage account where BlobDownloadService will download blobs from.|
|localBlobDownloadPath|The local file system path where blobs will be downloaded to.|
|allowedEventTypes|This filters Event Grid event types. The default is the `Microsoft.Storage.BlobCreated` event that gets triggered when a new blob is created and BlobDownloadService will then download it to the local file system.|

## Event Hub Receiver
Provides functionality to receive Event Grid messages from Event Hub, specifically Azure Storage Event Grid messages.

`Documentation:` [Azure Event Hubs](https://docs.microsoft.com/en-us/azure/event-hubs/event-hubs-about)
```json
{
    "receiverName": "string",
    "eventHubConnectionString": "string",
    "eventHubName": "string",
    "consumerGroupName": "string",
    "blobConnectionString": "string",
    "localBlobDownloadPath": "string",
    "allowedEventTypes": []
}
```
|Property|Description|
|-|-|
|receiverName|A unique name that would help distinguish this receiver from another. This name is helpful for parsing logs.|
|eventHubConnectionString|The connection string used for authenticating with Event Hub.|
|eventHubName|The Event Hub name where messages are received.|
|consumerGroupName|The Event Hub consumer group to use.|
|blobConnectionString|The connection string used for authenticating to the storage account where BlobDownloadService will download blobs from.|
|localBlobDownloadPath|The local file system path where blobs will be downloaded to.|
|allowedEventTypes|This filters Event Grid event types. The default is the `Microsoft.Storage.BlobCreated` event that gets triggered when a new blob is created and BlobDownloadService will then download it to the local file system.|