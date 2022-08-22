// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Processor;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace BlobDownloadService
{
    public class EventHubReceiver : ReceiverBase<EventHubReceiverOptions>, IEventGridMessageReceiver
    {
        private BlobContainerClient _blobContainerClient;
        private EventProcessorClient _processor;

        public EventHubReceiver(EventHubReceiverOptions options, ILogger logger, CancellationToken token)
            : base(options, logger, token)
        {
            var evt = $"{nameof(EventHubReceiver)}::.ctor";
            var msg = $"Initializing {nameof(EventHubReceiver)} with a name of '{Options.ReceiverName}'";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                _blobContainerClient = new BlobContainerClient(Options.BlobConnectionString, options.CheckpointContainerName);
                _processor = new EventProcessorClient(_blobContainerClient, Options.ConsumerGroupName, Options.EventHubConnectionString);

                _processor.ProcessEventAsync += HandleReceivedMessageAsync;
                _processor.ProcessErrorAsync += HandleEventHubErrorAsync;
            }
        }

        public async Task StartReceiverAsync()
        {
            var evt = $"{nameof(EventHubReceiver)}::{nameof(StartReceiverAsync)}";
            var msg = $"Starting receiver '{ReceiverName}'";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                try
                {
                    await _blobContainerClient.CreateIfNotExistsAsync(cancellationToken: Token).ConfigureAwait(false);
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
            var evt = $"{nameof(EventHubReceiver)}::{nameof(StopReceiverAsync)}";
            var msg = $"Stopping receiver '{ReceiverName}'";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                await _processor.StopProcessingAsync().ConfigureAwait(false);
            }
        }

        private async Task HandleReceivedMessageAsync(ProcessEventArgs arg)
        {
            var secondaryCorrelationId = Guid.NewGuid();
            var evt = $"{nameof(EventHubReceiver)}::{nameof(HandleReceivedMessageAsync)}";
            var msg = "Handling Event Grid message...";
            var eventGridMessages = JsonConvert.DeserializeObject<List<EventGridMessage>>(arg.Data.EventBody.ToString());
            foreach (var message in eventGridMessages)
            {
                using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName, secondaryCorrelationId))
                {
                    try
                    {
                        log.ExtendedMessage = message;
                        var blobMetadata = BlobMetadata.CreateNew(message);
                        log.AddBlobMetadata(blobMetadata);

                        if (Options.AllowedEventTypes.Contains(message.EventType))
                        {
                            await DownloadBlobAsync(blobMetadata, secondaryCorrelationId).ConfigureAwait(false);
                            await LogCompleteAsync(blobMetadata, secondaryCorrelationId);
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

                await UpdateCheckpointAsync(arg, secondaryCorrelationId).ConfigureAwait(false);
            }
        }
        private Task LogCompleteAsync(BlobMetadata blobMetadata, Guid secondaryCorrelationId)
        {
            var evt = $"{nameof(EventHubReceiver)}::{nameof(LogCompleteAsync)}";
            var msg = "Completed...";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName, secondaryCorrelationId))
            {
                log.AddBlobMetadata(blobMetadata);
            }

            return Task.CompletedTask;
        }

        private async Task UpdateCheckpointAsync(ProcessEventArgs args, Guid secondaryCorrelationId)
        {
            var evt = $"{nameof(EventHubReceiver)}::{nameof(UpdateCheckpointAsync)}";
            var msg = "Updating checkpoint...";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName, secondaryCorrelationId))
            {
                try
                {
                    await args.UpdateCheckpointAsync(Token).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    var receiverException = new ReceiverException($"Unable to checkpoint, inner exception: {ex.Message}", ex);
                    log.LogLevel = LogLevel.Error;
                    log.Exception = receiverException;
                }
            }
        }

        private Task HandleEventHubErrorAsync(ProcessErrorEventArgs arg)
        {
            var evt = $"{nameof(EventHubReceiver)}::{nameof(HandleEventHubErrorAsync)}";
            var msg = "An error occurred with the Event Hub processor, please see exception for details...";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName))
            {
                log.LogLevel = LogLevel.Error;
                log.Exception = arg.Exception;
            }

            return Task.CompletedTask;
        }
    }
}