// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;

namespace BlobDownloadService
{
    public abstract class ReceiverBase<TReceiverOptions> where TReceiverOptions : ReceiverBaseOptions
    {
        internal TReceiverOptions Options;
        internal ILogger Logger;
        internal CancellationToken Token { get; }
        internal string ReceiverName;
        private const string _streamingTmpFileExtension = ".tmp";

        protected ReceiverBase(TReceiverOptions options, ILogger logger, CancellationToken token)
        {
            Options = options ?? throw new ArgumentNullException(nameof(options));
            Logger = logger ?? throw new ArgumentNullException(nameof(logger));
            Token = token;
            ReceiverName = Options.ReceiverName;
        }

        internal async Task<bool> DownloadBlobAsync(BlobMetadata blobMetadata, Guid secondaryCorrelationId)
        {
            bool isSuccess = false;
            var fullLocalFilePath = Path.Combine(Options.LocalBlobDownloadPath, blobMetadata.Filename);
            var fullLocalDirPath = Path.GetDirectoryName(fullLocalFilePath);

            var evt = $"{nameof(ReceiverBase<TReceiverOptions>)}::{nameof(DownloadBlobAsync)}";
            var msg = $"Saving blob to, '{fullLocalFilePath}'";
            using (var log = LogMessage.CreateNew(evt, msg, Logger, ReceiverName, secondaryCorrelationId))
            {
                log.AddBlobMetadata(blobMetadata);

                try
                {
                    var blobClient = new BlobClient(Options.BlobConnectionString, blobMetadata.ContainerName, blobMetadata.Filename);
                    if (!Directory.Exists(fullLocalDirPath)) Directory.CreateDirectory(fullLocalDirPath);

                    // Download file with _streamingTmpFileExtension while streaming
                    var tmpBlobFilename = $"{fullLocalFilePath}{_streamingTmpFileExtension}";
                    using (FileStream fs = File.OpenWrite(tmpBlobFilename))
                    {
                        await blobClient.DownloadToAsync(fs, Token).ConfigureAwait(false);
                        fs.Close();
                    }

                    // Once the download is complete, rename file to exclude _streamingTmpFileExtension
                    File.Move(tmpBlobFilename, fullLocalFilePath, true);

                    isSuccess = true;
                }
                catch (Exception ex)
                {
                    var receiverException = new ReceiverException($"Unable to download blob, inner exception: {ex.Message}", ex);
                    log.LogLevel = LogLevel.Error;
                    log.Exception = receiverException;
                    throw;
                }
            }

            return isSuccess;
        }
    }
}