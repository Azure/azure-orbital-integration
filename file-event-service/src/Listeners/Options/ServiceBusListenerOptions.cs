/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System.Collections.Generic;
using FileEventService.Utilities;

namespace FileEventService.Listeners.Options
{
    public class ServiceBusListenerOptions
    {
        public EventListenerType Type { get; set; }
        public string Name { get; set; }
        public string ConnectionString { get; set; }
        public string TopicOrQueueName { get; set; }
        public string SubscriptionName { get; set; } = string.Empty;
        public int MaxAutoLockRenewalSeconds { get; set; } = 1800;
        public int MaxConcurrentCalls { get; set; } = 5;
        public dynamic[] Actions { get; set; }
        public List<string> AllowedEventTypes { get; set; }

        public string AsJsonSerializedString()
        {
            var options = new ServiceBusListenerOptions
            {
                Name = Name,
                ConnectionString = Constants.RedactedSecretMask,
                TopicOrQueueName = TopicOrQueueName,
                SubscriptionName = SubscriptionName,
                MaxAutoLockRenewalSeconds = MaxAutoLockRenewalSeconds,
                MaxConcurrentCalls = MaxConcurrentCalls,
                Actions = new string[] { Constants.RedactedSecretMask },
                AllowedEventTypes = AllowedEventTypes
            };

            return JsonUtils.SerializeObject(options);
        }
    }
}
