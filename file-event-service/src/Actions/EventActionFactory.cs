/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using FileEventService.Actions.Options;
using FileEventService.Utilities;
using Microsoft.Extensions.Logging;

namespace FileEventService.Actions
{
    public static class EventActionFactory
    {
        public static IEventAction RegisterListenerEventAction(ListenerEventActionType type, dynamic options, string name, ILogger logger)
        {
            try
            {
                switch (type)
                {
                    case ListenerEventActionType.BlobDownload:
                        return BlobDownloadEventAction.Register(
                                JsonUtils.DeserializeObject<BlobDownloadActionOptions>(options), name, logger);

                    case ListenerEventActionType.ExecuteScript:
                        return ScriptEventAction.Register(
                                JsonUtils.DeserializeObject<ScriptEventActionOptions>(options), name, logger);

                    default:
                        throw new NotImplementedException($"Action type '{type.ToString()}' is not implemented.");
                }
            }
            catch (Exception ex)
            {
                throw new EventActionException(ex.Message, ex);
            }
        }

        public static IEventAction RegisterDispatcherEventAction(DispatcherEventActionType type, dynamic options, string name, ILogger logger)
        {
            try
            {
                switch (type)
                {
                    case DispatcherEventActionType.SendEventGridEvent:
                        return EventGridEventAction.Register(
                                JsonUtils.DeserializeObject<EventGridEventActionOptions>(options), name, logger);

                    case DispatcherEventActionType.ExecuteScript:
                        return ScriptEventAction.Register(
                                JsonUtils.DeserializeObject<ScriptEventActionOptions>(options), name, logger);

                    case DispatcherEventActionType.BlobUpload:
                        return BlobUploadEventAction.Register(
                                JsonUtils.DeserializeObject<BlobUploadActionOptions>(options), name, logger);

                    default:
                        throw new NotImplementedException($"Action type '{type.ToString()}' is not implemented.");
                }
            }
            catch (Exception ex)
            {
                throw new EventActionException(ex.Message, ex);
            }
        }
    }
}