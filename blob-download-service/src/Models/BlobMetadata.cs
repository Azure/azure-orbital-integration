// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

namespace BlobDownloadService
{
    public class BlobMetadata
    {
        public string ContainerName { get; set; }
        public string Filename { get; set; }
        public double SizeInBytes { get; set; }
        public string EventType { get; set; }

        public static BlobMetadata CreateNew(EventGridMessage eventGridMessage)
        {
            return new BlobMetadata
            {
                ContainerName = eventGridMessage.ContainerName,
                Filename = eventGridMessage.BlobName,
                SizeInBytes = eventGridMessage.Data.ContentLength,
                EventType = eventGridMessage.EventType
            };
        }
    }
}