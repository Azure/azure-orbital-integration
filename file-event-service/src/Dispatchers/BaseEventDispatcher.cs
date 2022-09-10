/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FileEventService.Actions;
using FileEventService.Utilities;
using Microsoft.Extensions.Logging;

namespace FileEventService.Dispatchers
{
    public abstract class BaseEventDispatcher : IEventDispatcher
    {
        internal List<IEventAction> ActionsList;

        internal BaseEventDispatcher()
        {
            ActionsList = new List<IEventAction>();
        }

        public abstract Task StartAsync();
        public abstract Task StopAsync();

        internal void RegisterActions(dynamic[] actionOptions, string name, ILogger logger)
        {
            foreach (var actionOption in actionOptions)
            {
                try
                {
                    var type = EnumUtils.GetEnumValueFromString<DispatcherEventActionType>(actionOption.type.ToString());
                    ActionsList.Add(EventActionFactory.RegisterDispatcherEventAction(type, actionOption, name, logger));
                }
                catch (NotImplementedException ex)
                {
                    logger.LogError(ex, ex.Message);
                }
                catch (EventActionException ex)
                {
                    logger.LogError(ex, ex.Message);
                }
            }
        }
    }
}