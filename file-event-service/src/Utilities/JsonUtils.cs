/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FileEventService.Utilities
{
    public class JsonUtils
    {
        public static T DeserializeObject<T>(JObject obj)
        {
            return JsonConvert.DeserializeObject<T>(obj.ToString());
        }

        public static T DeserializeObject<T>(string str)
        {
            return JsonConvert.DeserializeObject<T>(str);
        }

        public static string SerializeObject(dynamic obj)
        {
            return JsonConvert.SerializeObject(obj);
        }
    }
}