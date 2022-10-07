/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure.Messaging.EventGrid;
using Azure.Storage.Blobs;
using FileEventService.Logging;
using FileEventService.Models;
using FileEventService.Utilities;
using Microsoft.Extensions.Logging;

namespace FileEventService.Actions
{
    public class BlobUploadEventAction : IEventAction
    {
        private BlobUploadActionOptions _options;
        private ILogger _logger;
        private string _name;
        private const string _streamingTmpFileExtension = ".tmp";
        private static string _className = nameof(BlobUploadEventAction);

        public static IEventAction Register(BlobUploadActionOptions options, string name, ILogger logger)
        {
            var evt = $"{_className}::{nameof(Register)}";
            var msg = $"Registering '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, name);

            log.ExtendedMessage = options.AsJsonSerializedString();
            log.Write(logger);

            return new BlobUploadEventAction
            {
                _options = options,
                _name = name,
                _logger = logger
            };
        }

        public async Task ProcessEventAsync(EventGridMessage eventGridMessage, Guid correlationId, CancellationToken token)
        {
            FileMetadata data = JsonUtils.DeserializeObject<FileMetadata>(eventGridMessage.Data.ToString());

            string filePath = $"{Path.TrimEndingDirectorySeparator(_options.FilePath)}{data.RelativeFilePath}";
            string lowerContainerName = _options.ContainerName.ToLowerInvariant();
            var evt = $"{_className}::{nameof(ProcessEventAsync)}";
            var msg = $"Starting blob upload to, '{lowerContainerName}/{filePath}'.";
            var sw = Stopwatch.StartNew();
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

            try
            {
                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                BlobServiceClient cli = new BlobServiceClient(_options.ConnectionString);
                var conCli = cli.GetBlobContainerClient(lowerContainerName);
                await conCli.CreateIfNotExistsAsync().ConfigureAwait(false);
                var blobClient = conCli.GetBlobClient(filePath);

                await blobClient.UploadAsync(data.FullFilePath, _options.Overwrite).ConfigureAwait(false);

                log.EventRuntimeMs = sw.ElapsedMilliseconds;
                log.Message = $"Ending blob upload to, '{lowerContainerName}/{filePath}'.";
                log.Write(_logger);
            }
            catch (Exception ex)
            {
                var exception = new EventActionException($"Unable to upload blob, inner exception: {ex.Message}", ex);
                log.Message = exception.Message;
                log.LogLevel = LogLevel.Error;
                log.Exception = exception;
                log.Write(_logger);

                throw exception;
            }
        }
    }
}
