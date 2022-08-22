// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Newtonsoft.Json;

namespace BlobDownloadService
{
    public class HeartbeatOptions
    {
        public int HeartbeatIntervalMs { get; set; } = 60000;

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}