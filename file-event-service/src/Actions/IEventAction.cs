/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Threading;
using System.Threading.Tasks;
using Azure.Messaging.EventGrid;
using FileEventService.Models;

namespace FileEventService.Actions
{
    public interface IEventAction
    {
        /// <summary>
        /// Action entry point to start processing an action
        /// </summary>
        /// <param name="message"></param>
        /// <param name="correlationId"></param>
        Task ProcessEventAsync(EventGridMessage eventGridMessage, Guid correlationId, CancellationToken token);
    }
}