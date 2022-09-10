/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using Azure.Messaging.EventGrid;
using Newtonsoft.Json;

namespace FileEventService.Models
{
    public class EventGridMessage
    {
        public string Topic { get; set; }
        public string Subject { get; set; }
        public string EventType { get; set; }
        public dynamic Data { get; set; }
        public string Id { get; set; }   
        public string DataVersion { get; set; }
        public DateTimeOffset EventTime { get; set; }

        public static EventGridMessage FromEventGridEvent(EventGridEvent eventGridEvent)
        {
            var dataAsDynamic = JsonConvert.DeserializeObject<dynamic>(eventGridEvent.Data.ToString());

            return new EventGridMessage
            {
                Topic = eventGridEvent.Topic,
                Subject = eventGridEvent.Subject,
                EventType = eventGridEvent.EventType,
                Data = dataAsDynamic,
                Id = eventGridEvent.Id,
                DataVersion = eventGridEvent.DataVersion,
                EventTime = eventGridEvent.EventTime
            };
        }

        public Guid ExtractCorrelationId()
        {
            return Data.CorrelationId;
        }
    }
}