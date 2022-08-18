// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using System.Text.Json.Serialization;

namespace BlobDownloadService
{
    public class ReceiverBaseOptions
    {
        [JsonIgnore]
        internal const string ObfuscatedString = "*****";

        public string ReceiverName { get; set; }
        public string BlobConnectionString { get; set; }
        public string LocalBlobDownloadPath { get; set; }
        public string[] AllowedEventTypes { get; set; }
    }
}