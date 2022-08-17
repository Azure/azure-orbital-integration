// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

namespace BlobDownloadService
{
    public class EventHubReceiverOptions : ReceiverBaseOptions
    {
        public string EventHubConnectionString { get; set; }
        public string EventHubName { get; set; }
        public string ConsumerGroupName { get; set; }
        // Issue # https://github.com/Azure/azure-orbital-integration/issues/29
        public string CheckpointContainerName { get; set; } = "blobdownloadservice";
    }
}