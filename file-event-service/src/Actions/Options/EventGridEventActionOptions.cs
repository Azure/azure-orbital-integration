/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
 
using System;
using FileEventService.Utilities;

namespace FileEventService.Actions
{
    public class EventGridEventActionOptions
    {
        public Uri TopicEndpoint { get; set; }
        public string Key { get; set; }

        public string AsJsonSerializedString()
        {
            var options = new EventGridEventActionOptions
            {
                TopicEndpoint = TopicEndpoint,
                Key = Constants.RedactedSecretMask
            };

            return JsonUtils.SerializeObject(options);
        }
    }
}