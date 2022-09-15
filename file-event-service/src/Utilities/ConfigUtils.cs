/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using FileEventService.Options;
using Newtonsoft.Json;

namespace FileEventService.Utilities
{
    public static class ConfigUtils
    {
        public static FileEventServiceOptions GetFileEventServiceOptions()
        {
            return JsonConvert.DeserializeObject<FileEventServiceOptions>(Constants.ConfigTextFilePath);
        }
    }
}
