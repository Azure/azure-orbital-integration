/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using FileEventService.Utilities;

namespace FileEventService.Actions
{
    public class ScriptEventActionOptions
    {
        public string Filename { get; set; }
        public string Arguments { get; set; }
        public string WorkingDirectory { get; set; }

        public string AsJsonSerializedString()
        {
            var options = new ScriptEventActionOptions
            {
                Filename = Filename,
                Arguments = Arguments,
                WorkingDirectory = WorkingDirectory
            };

            return JsonUtils.SerializeObject(options);
        }
    }
}
