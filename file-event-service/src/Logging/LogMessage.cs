/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace FileEventService.Logging
{
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class LogMessage
    {
        public string Name { get; set; }
        public string Event { get; set; }
        public string Message { get; set; }
        public string ErrorMessage { get; set; }
        public object ExtendedMessage { get; set; }
        public double EventRuntimeMs { get; set; }
        public Guid CorrelationId { get; set; }

        [JsonIgnore]
        public Exception Exception { get; set; }

        [JsonIgnore]
        public LogLevel LogLevel = LogLevel.Information;

        public LogMessage(string name, string evt, string msg, Guid correlationId = default, LogLevel logLevel = LogLevel.Information)
        {
            Name = name;
            Event = evt;
            Message = msg;
            CorrelationId = correlationId;
            LogLevel = logLevel;
        }

        /// <summary>
        /// Creates a new LogMessage in a consistent manner. To send a
        /// message once created, call Write(ILogger) to write the log.
        /// </summary>
        /// <param name="evt"></param>
        /// <param name="msg"></param>
        /// <param name="logger"></param>
        /// <param name="name"></param>
        /// <param name="correlationId"></param>
        /// <returns></returns>
        public static LogMessage CreateNew(string evt, string msg, string name = "", Guid correlationId = default)
        {
            var logMessage = new LogMessage(name, evt, msg, correlationId);

            return logMessage;
        }

        public string AsJsonSerializedString()
        {
            return JsonConvert.SerializeObject(this, Formatting.None);
        }

        /// <summary>
        /// Writes the instance of LogMessage to the log.
        /// </summary>
        /// <param name="logger">ILogger object that will be used to write to log.</param>
        public void Write(ILogger logger)
        {
            switch (LogLevel)
            {
                case LogLevel.Information:
                    logger.LogInformation(this.AsJsonSerializedString());
                    return;

                case LogLevel.Warning:
                    logger.LogWarning(this.AsJsonSerializedString());
                    return;

                case LogLevel.Error:
                    ErrorMessage = Exception.Message;
                    logger.LogError(Exception, this.AsJsonSerializedString());
                    return;

                default:
                    throw new NotImplementedException($"Log level of '{LogLevel.ToString()}' is not implemented...");
            }
        }
    }
}
