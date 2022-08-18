// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace BlobDownloadService
{
    public class ServiceBusReceiver : ReceiverBase<ServiceBusReceiverOptions>, IEventGridMessageReceiver
    {
        private ServiceBusClient _serviceBusClient;
        private ServiceBusProcessor _processor;

        public ServiceBusReceiver(ServiceBusReceiverOptions options, ILogger logger, CancellationToken token)
            : base(options, logger, token)
        {
            var evt = $"{nameof(ServiceBusReceiver)}::.ctor";
            var msg = $"Initializing {nameof(ServiceBusReceiver)} with a name of '{Options.ReceiverName}'";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                log.ExtendedMessage = Options.ToString();
                _serviceBusClient = new ServiceBusClient(Options.ServiceBusConnectionString);

                var serviceBusOptions = new ServiceBusProcessorOptions();
                serviceBusOptions.AutoCompleteMessages = false;
                serviceBusOptions.MaxAutoLockRenewalDuration = new TimeSpan(0, 0, options.MaxAutoLockRenewalSeconds);
                serviceBusOptions.MaxConcurrentCalls = Options.MaxConcurrentCalls;

                // Issue # https://github.com/Azure/azure-orbital-integration/issues/30
                _processor = _serviceBusClient.CreateProcessor(Options.ServiceBusQueueName, serviceBusOptions);
                _processor.ProcessMessageAsync += HandleReceivedMessageAsync;
                _processor.ProcessErrorAsync += HandleServiceBusErrorAsync;
            }
        }

        public async Task StartReceiverAsync()
        {
            var evt = $"{nameof(ServiceBusReceiver)}::{nameof(StartReceiverAsync)}";
            var msg = $"Starting receiver '{ReceiverName}'";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                try
                {
                    await _processor.StartProcessingAsync(Token).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    var receiverException = new ReceiverException($"Unable to start receiver, inner exception: {ex.Message}", ex);
                    log.LogLevel = LogLevel.Error;
                    log.Exception = receiverException;
                }
            }
        }

        public async Task StopReceiverAsync()
        {
            var evt = $"{nameof(ServiceBusReceiver)}::{nameof(StopReceiverAsync)}";
            var msg = $"Stopping receiver '{ReceiverName}'";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                await _processor.DisposeAsync().ConfigureAwait(false);
                await _serviceBusClient.DisposeAsync().ConfigureAwait(false);
            }
        }

        private async Task HandleReceivedMessageAsync(ProcessMessageEventArgs arg)
        {
            var evt = $"{nameof(ServiceBusReceiver)}::{nameof(HandleReceivedMessageAsync)}";
            var secondaryCorrelationId = Guid.NewGuid();
            var msg = "Handling Event Grid message...";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName, secondaryCorrelationId))
            {
                try
                {
                    var eventGridMessage = JsonConvert.DeserializeObject<EventGridMessage>(arg.Message.Body.ToString());
                    log.ExtendedMessage = eventGridMessage;

                    var blobMetadata = BlobMetadata.CreateNew(eventGridMessage);
                    log.AddBlobMetadata(blobMetadata);

                    if (Options.AllowedEventTypes.Contains(eventGridMessage.EventType))
                    {
                        await DownloadBlobAsync(blobMetadata, secondaryCorrelationId).ConfigureAwait(false);
                        await CompleteMessageAsync(arg, blobMetadata, secondaryCorrelationId).ConfigureAwait(false);
                    }
                    else
                    {
                        log.LogLevel = LogLevel.Warning;
                        log.ExtendedMessage = "Unable to process message since it does not match the allowedEventTypes set in the configuration.";
                    }
                }
                catch (Exception ex)
                {
                    var receiverException = new ReceiverException($"Unable to handle received message, inner exception: {ex.Message}", ex);
                    log.LogLevel = LogLevel.Error;
                    log.Exception = receiverException;
                }
            }
        }

        private Task HandleServiceBusErrorAsync(ProcessErrorEventArgs arg)
        {
            var evt = $"{nameof(ServiceBusReceiver)}::{nameof(HandleServiceBusErrorAsync)}";
            var msg = "An error occurred with the Service Bus processor, please see exception for details...";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                log.LogLevel = LogLevel.Error;
                log.Exception = arg.Exception;
            }

            return Task.CompletedTask;
        }

        private async Task CompleteMessageAsync(ProcessMessageEventArgs args, BlobMetadata blobMetadata, Guid secondaryCorrelationId)
        {
            var evt = $"{nameof(ServiceBusReceiver)}::{nameof(CompleteMessageAsync)}";
            var msg = "Completing message...";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName, secondaryCorrelationId))
            {
                log.AddBlobMetadata(blobMetadata);

                try
                {
                    await args.CompleteMessageAsync(args.Message).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    var receiverException = new ReceiverException($"Unable to complete message, inner exception: {ex.Message}", ex);
                    log.LogLevel = LogLevel.Error;
                    log.Exception = receiverException;
                }
            }
        }
    }
}