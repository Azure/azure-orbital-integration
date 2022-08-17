// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace BlobDownloadService
{
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class LogMessage : IDisposable
    {
        public string ReceiverName { get; set; }
        public string Event { get; set; }
        public string Message { get; set; }
        public string ErrorMessage { get; set; }
        public object ExtendedMessage { get; set; }
        public string Filename { get; set; }
        public double SizeInBytes { get; set; }
        public double EventRuntimeMs { get; set; }
        public string ContainerName { get; set; }
        public string EventGridEventType { get; set; }
        public Guid SecondaryCorrelationId { get; set; }

        [JsonIgnore]
        public Exception Exception { get; set; }

        [JsonIgnore]
        private ILogger _logger;

        [JsonIgnore]
        public LogLevel LogLevel = LogLevel.Information;

        [JsonIgnore]
        private Stopwatch? stopwatch;

        public static LogMessage CreateNew(string evt, string message, ILogger logger, string receiverName = "", Guid secondaryCorrelationId = default)
        {
            var logMessage = new LogMessage
            {
                _logger = logger,
                ReceiverName = receiverName,
                Event = evt,
                Message = message,
                stopwatch = Stopwatch.StartNew(),
                SecondaryCorrelationId = secondaryCorrelationId
            };

            return logMessage;
        }

        private static object ExtractClassName(Type type)
        {
            var splitClassPath = type.ToString().Split('.');
            var classNameOnly = splitClassPath.Last();
            return classNameOnly;
        }

        private void CaptureElapsed()
        {
            if (stopwatch != null) EventRuntimeMs = stopwatch.ElapsedMilliseconds;
        }

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this, Formatting.Indented);
        }

        public void AddBlobMetadata(BlobMetadata blobLogMetadata)
        {
            ContainerName = blobLogMetadata.ContainerName;
            Filename = blobLogMetadata.Filename;
            SizeInBytes = blobLogMetadata.SizeInBytes;
            EventGridEventType = blobLogMetadata.EventType;
        }

        public void Dispose()
        {
            CaptureElapsed();

            switch (LogLevel)
            {
                case LogLevel.Information:
                    _logger.LogInformation(this.ToString());
                    return;

                case LogLevel.Warning:
                    _logger.LogWarning(this.ToString());
                    return;

                case LogLevel.Error:
                    ErrorMessage = Exception.Message;
                    _logger.LogError(Exception, this.ToString());
                    return;

                default:
                    throw new NotImplementedException($"Log level of '{LogLevel.ToString()}' is not implemented...");
            }
        }
    }
}