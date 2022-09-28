/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System.Text.Json.Serialization;
using FileEventService.Utilities;

namespace FileEventService.Actions
{
    public class BlobUploadActionOptions
    {
        public string ConnectionString { get; set; }
        public string ContainerName { get; set; }
        public string FilePath { get; set; } = string.Empty;

        public string AsJsonSerializedString()
        {
            var options = new BlobUploadActionOptions
            {
                ConnectionString = Constants.RedactedSecretMask,
                ContainerName = ContainerName,
                FilePath = FilePath
            };

            return JsonUtils.SerializeObject(options);
        }
    }
}
