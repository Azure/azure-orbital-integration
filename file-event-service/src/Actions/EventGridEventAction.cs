/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Messaging.EventGrid;
using FileEventService.Logging;
using FileEventService.Models;
using Microsoft.Extensions.Logging;

namespace FileEventService.Actions
{
    public class EventGridEventAction : IEventAction
    {
        private EventGridPublisherClient _client;
        private string _name;
        private ILogger _logger;
        private static string _className = nameof(EventGridEventAction);

        public static IEventAction Register(EventGridEventActionOptions options, string name, ILogger logger)
        {
            var evt = $"{_className}::{nameof(Register)}";
            var msg = $"Registering '{_className}' for '{name}'";
            var log = LogMessage.CreateNew(evt, msg, name);

            log.ExtendedMessage = options.AsJsonSerializedString();
            log.Write(logger);

            return new EventGridEventAction
            {
                _client = new EventGridPublisherClient(options.TopicEndpoint, new AzureKeyCredential(options.Key)),
                _name = name,
                _logger = logger
            };
        }

        public async Task ProcessEventAsync(EventGridMessage eventGridMessage, Guid correlationId, CancellationToken token)
        {
            var evt = $"{_className}::{nameof(ProcessEventAsync)}";
            var msg = $"Starting send Event Grid message.";
            var sw = Stopwatch.StartNew();
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

            try
            {
                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                var eventGridEvent = BuidlEventGridEvent(eventGridMessage);
                await _client.SendEventAsync(eventGridEvent, token).ConfigureAwait(false);

                log.EventRuntimeMs = sw.ElapsedMilliseconds;
                log.Message = $"Ending send Event Grid message.";
                log.Write(_logger);
            }
            catch (Exception ex)
            {
                var exception = new EventActionException($"Unable to send Event Grid event, inner exception: {ex.Message}", ex);
                log.Message = exception.Message;
                log.LogLevel = LogLevel.Error;
                log.Exception = exception;
                log.Write(_logger);

                throw exception;
            }
        }

        private EventGridEvent BuidlEventGridEvent(EventGridMessage eventGridMessage)
        {
            return new EventGridEvent(
                        subject: eventGridMessage.Subject,
                        eventType: eventGridMessage.EventType,
                        dataVersion: eventGridMessage.DataVersion,
                        data: new BinaryData(eventGridMessage.Data.ToString()));
        }
    }
}
