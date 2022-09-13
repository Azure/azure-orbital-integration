/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Threading.Tasks;
using Azure.Messaging.ServiceBus;
using FileEventService.Listeners.Options;
using FileEventService.Logging;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading;
using Azure.Messaging.EventGrid;
using System.Diagnostics;
using FileEventService.Models;
using FileEventService.Actions;

namespace FileEventService.Listeners
{
    public class ServiceBusEventListener : BaseEventListener
    {
        private ServiceBusProcessor _processor;
        private string _name;
        private List<string> _allowedEventTypes;
        private ILogger _logger;
        private CancellationToken _token;
        private ServiceBusListenerOptions _options;
        private static string _className = nameof(ServiceBusEventListener);

        public static IEventListener Register(ServiceBusListenerOptions options, ILogger logger, CancellationToken token)
        {
            var evt = $"{_className}::{nameof(Register)}";
            var msg = $"Registering {_className}.";
            var log = LogMessage.CreateNew(evt, msg, options.Name);

            log.ExtendedMessage = options.AsJsonSerializedString();
            log.Write(logger);

            var serviceBusOptions = new ServiceBusProcessorOptions
            {
                AutoCompleteMessages = false,
                MaxAutoLockRenewalDuration = new TimeSpan(0, 0, options.MaxAutoLockRenewalSeconds),
                MaxConcurrentCalls = options.MaxConcurrentCalls
            };

            return new ServiceBusEventListener
            {
                _processor = new ServiceBusClient(options.ConnectionString)
                    .CreateProcessor(options.QueueName, serviceBusOptions),
                _name = options.Name,
                _options = options,
                _allowedEventTypes = options.AllowedEventTypes,
                _logger = logger,
                _token = token
            };
        }

        public override async Task StartAsync()
        {
            var evt = $"{_className}::{nameof(StopAsync)}";
            var msg = $"Starting '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, _name);
            log.Write(_logger);

            RegisterActions(_options.Actions, _name, _logger);
            _processor.ProcessMessageAsync += HandleReceivedMessageAsync;
            _processor.ProcessErrorAsync += HandleServiceBusErrorAsync;
            await _processor.StartProcessingAsync().ConfigureAwait(false);
        }

        public override async Task StopAsync()
        {
            var evt = $"{_className}::{nameof(StopAsync)}";
            var msg = $"Stopping '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, _name);
            log.Write(_logger);

            await _processor.DisposeAsync().ConfigureAwait(false);
        }

        private Task HandleServiceBusErrorAsync(ProcessErrorEventArgs arg)
        {
            var evt = $"{_className}::{nameof(HandleServiceBusErrorAsync)}";
            var msg = arg.Exception.Message;
            var log = LogMessage.CreateNew(evt, msg, _name);

            log.LogLevel = LogLevel.Error;
            log.Exception = arg.Exception;
            log.Write(_logger);

            return Task.CompletedTask;
        }

        private async Task HandleReceivedMessageAsync(ProcessMessageEventArgs arg)
        {
            var evt = $"{_className}::{nameof(HandleReceivedMessageAsync)}";
            var correlationId = Guid.NewGuid();
            var msg = "Starting the handling of Event Grid message via Service Bus.";
            var sw = Stopwatch.StartNew();
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

            try
            {
                EventGridMessage eventGridMessage = EventGridMessage.FromEventGridEvent(EventGridEvent.Parse(arg.Message.Body));
                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                if (_allowedEventTypes.Contains(eventGridMessage.EventType))
                {
                    foreach (var action in ActionsList)
                    {
                        await action.ProcessEventAsync(eventGridMessage, correlationId, _token).ConfigureAwait(false);
                    }

                    await CompleteMessageAsync(arg, correlationId).ConfigureAwait(false);
                }

                log.EventRuntimeMs = sw.ElapsedMilliseconds;
                log.Message = $"Ending the handling of Event Grid message via Service Bus.";
                log.Write(_logger);
            }
            catch (EventActionException ex)
            {
                log.Message = ex.Message;
                log.LogLevel = LogLevel.Error;
                log.Exception = ex;
                log.Write(_logger);
            }
        }

        private async Task CompleteMessageAsync(ProcessMessageEventArgs args, Guid correlationId)
        {
            var evt = $"{_className}::{nameof(CompleteMessageAsync)}";
            var msg = "Completing Event Grid message.";
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);
            log.Write(_logger);

            try
            {
                await args.CompleteMessageAsync(args.Message).ConfigureAwait(false);
            }
            catch (ServiceBusException ex)
            {
                log.Message = ex.Message;
                log.LogLevel = LogLevel.Error;
                log.Exception = ex;
                log.Write(_logger);
            }
        }
    }
}
