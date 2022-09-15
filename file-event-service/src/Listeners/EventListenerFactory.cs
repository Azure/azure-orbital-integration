/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Threading;
using FileEventService.Listeners.Options;
using FileEventService.Utilities;
using Microsoft.Extensions.Logging;

namespace FileEventService.Listeners
{
    public static class EventListenerFactory
    {
        public static IEventListener RegisterEventListener(EventListenerType type, dynamic options, ILogger logger, CancellationToken token)
        {
            switch (type)
            {
                case EventListenerType.ServiceBus:
                    return ServiceBusEventListener.Register(JsonUtils.DeserializeObject<ServiceBusListenerOptions>(options), logger, token);

                default:
                    throw new NotImplementedException($"Event listener type '{type.ToString()}' is not implemented.");
            }
        }
    }
}
