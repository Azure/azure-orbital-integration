/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using FileEventService.Logging;
using FileEventService.Models;
using Microsoft.Extensions.Logging;

namespace FileEventService.Actions.Options
{
    public class BlobDownloadEventAction : IEventAction
    {
        private BlobDownloadActionOptions _options;
        private ILogger _logger;
        private string _name;
        private const string _streamingTmpFileExtension = ".tmp";
        private static string _className = nameof(BlobDownloadEventAction);

        public static IEventAction Register(BlobDownloadActionOptions options, string name, ILogger logger)
        {
            var evt = $"{_className}::{nameof(Register)}";
            var msg = $"Registering '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, name);

            log.ExtendedMessage = options.AsJsonSerializedString();
            log.Write(logger);

            return new BlobDownloadEventAction
            {
                _options = options,
                _name = name,
                _logger = logger
            };
        }

        public async Task ProcessEventAsync(EventGridMessage eventGridMessage, Guid correlationId, CancellationToken token)
        {
            string containerName = eventGridMessage.Subject.Split("containers/")[1].Split("/")[0];
            string blobName = eventGridMessage.Subject.Split("blobs/")[1];

            var fullLocalFilePath = Path.Combine(_options.LocalBlobDownloadPath, blobName);
            var fullLocaltmpFilename = $"{fullLocalFilePath}{_streamingTmpFileExtension}";
            var fullLocalDirPath = Path.GetDirectoryName(fullLocalFilePath);

            var evt = $"{_className}::{nameof(ProcessEventAsync)}";
            var msg = $"Starting blob download, saving blob to, '{fullLocalFilePath}'.";
            var sw = Stopwatch.StartNew();
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

            try
            {
                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                var blobClient = new BlobClient(_options.ConnectionString, containerName, blobName);
                if (!Directory.Exists(fullLocalDirPath)) Directory.CreateDirectory(fullLocalDirPath);

                // Download file with _streamingTmpFileExtension while streaming
                using (FileStream fs = File.OpenWrite(fullLocaltmpFilename))
                {
                    await blobClient.DownloadToAsync(fs, token).ConfigureAwait(false);
                    fs.Close();
                }

                // Once the download is complete, rename file to exclude _streamingTmpFileExtension
                File.Move(fullLocaltmpFilename, fullLocalFilePath, true);

                log.EventRuntimeMs = sw.ElapsedMilliseconds;
                log.Message = $"Ending blob download, saving blob to, '{fullLocalFilePath}'.";
                log.Write(_logger);
            }
            catch (Exception ex)
            {
                // Clean up tmp file if exists from the failed blob download
                if (File.Exists(fullLocaltmpFilename)) File.Delete(fullLocaltmpFilename);

                var exception = new EventActionException($"Unable to download blob, inner exception: {ex.Message}", ex);
                log.Message = exception.Message;
                log.LogLevel = LogLevel.Error;
                log.Exception = exception;
                log.Write(_logger);

                throw exception;
            }
        }
    }
}
