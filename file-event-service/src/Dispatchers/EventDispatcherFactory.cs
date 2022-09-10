/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Threading;
using FileEventService.Dispatchers;
using FileEventService.Dispatchers.Options;
using FileEventService.Utilities;
using Microsoft.Extensions.Logging;

namespace FileEventService.Listeners
{
    public static class EventDispatcherFactory
    {
        public static IEventDispatcher RegisterEventDispatcher(EventDispatcherType type, dynamic options, ILogger logger, CancellationToken token)
        {
            switch (type)
            {
                case EventDispatcherType.LocalFileSystem:
                    return LocalFileSystemEventDispatcher.Register(JsonUtils.DeserializeObject<LocalFileSystemDispatcherOptions>(options), logger, token);
                
                default:
                    throw new NotImplementedException($"Event dispatcher type '{type.ToString()}' is not implemented.");
            }
        }
    }
}