/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using FileEventService.Utilities;

namespace FileEventService.Actions
{
    public class BlobDownloadActionOptions
    {
        public string ConnectionString { get; set; }
        public string LocalBlobDownloadPath { get; set; }

        public string AsJsonSerializedString()
        {
            var options = new BlobDownloadActionOptions
            {
                ConnectionString = Constants.RedactedSecretMask,
                LocalBlobDownloadPath = LocalBlobDownloadPath
            };

            return JsonUtils.SerializeObject(options);
        }
    }
}
