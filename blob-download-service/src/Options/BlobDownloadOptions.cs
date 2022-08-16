// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

namespace BlobDownloadService
{
    public class BlobDownloadOptions
    {
        public string EnvironmentName { get; set; }
        public string UserAssignedManagedIdentityName { get; set; }
        public List<ServiceBusReceiverOptions> ServiceBusReceivers { get; set; } = new();
        public List<EventHubReceiverOptions> EventHubReceivers { get; set; } = new();
    }
}