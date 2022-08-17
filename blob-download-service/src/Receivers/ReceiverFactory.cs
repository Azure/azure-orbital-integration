// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Microsoft.Extensions.Logging;

namespace BlobDownloadService
{
    public class ReceiverFactory
    {
        public static List<IEventGridMessageReceiver> GetReceiver(List<ServiceBusReceiverOptions> options, ILogger logger, CancellationToken token)
        {
            List<IEventGridMessageReceiver> receivers = new();
            options.ForEach(option => receivers.Add(new ServiceBusReceiver(option, logger, token)));
            return receivers;
        }

        public static List<IEventGridMessageReceiver> GetReceiver(List<EventHubReceiverOptions> options, ILogger logger, CancellationToken token)
        {
            List<IEventGridMessageReceiver> receivers = new();
            options.ForEach(option => receivers.Add(new EventHubReceiver(option, logger, token)));
            return receivers;
        }
    }
}