/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System.Collections.Generic;
using FileEventService.Utilities;

namespace FileEventService.Dispatchers.Options
{
    public class LocalFileSystemDispatcherOptions
    {
        public EventDispatcherType Type { get; set; }
        public string Name { get; set; }
        public string PathToWatch { get; set; }
        public bool IncludeSubDirectories { get; set; }
        public List<string> Filters { get; set; }
        public List<string> AllowedEventTypes { get; set; }
        public dynamic[] Actions { get; set; }

        public string AsJsonSerializedString()
        {
            var options = new LocalFileSystemDispatcherOptions
            {
                Type = Type,
                Name = Name,
                PathToWatch = PathToWatch,
                IncludeSubDirectories = IncludeSubDirectories,
                Filters = Filters,
                AllowedEventTypes = AllowedEventTypes
            };

            return JsonUtils.SerializeObject(options);
        }
    }
}
