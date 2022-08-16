// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Newtonsoft.Json;

namespace BlobDownloadService
{
    public class ServiceBusReceiverOptions : ReceiverBaseOptions
    {
        public string ServiceBusConnectionString { get; set; }
        public string ServiceBusQueueName { get; set; }
        public int MaxAutoLockRenewalSeconds { get; set; } = 1800;
        public int MaxConcurrentCalls { get; set; } = 5;

        public override string ToString()
        {

            ServiceBusReceiverOptions obfuscatedOptions = new ServiceBusReceiverOptions
            {
                ServiceBusConnectionString = ObfuscatedString,
                ServiceBusQueueName = ServiceBusQueueName,
                MaxAutoLockRenewalSeconds = MaxAutoLockRenewalSeconds,
                MaxConcurrentCalls = MaxConcurrentCalls,
                ReceiverName = ReceiverName,
                BlobConnectionString = ObfuscatedString,
                LocalBlobDownloadPath = LocalBlobDownloadPath,
                AllowedEventTypes = AllowedEventTypes
            };

            return JsonConvert.SerializeObject(obfuscatedOptions);
        }
    }
}