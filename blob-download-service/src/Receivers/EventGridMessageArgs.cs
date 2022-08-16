// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

namespace BlobDownloadService
{
    public class EventGridMessageArgs : EventArgs
    {
        public Guid MessageId { get; set; }
        public EventGridMessage Message { get; set; }
        public BlobMetadata BlobMetadata { get; set; }

        public static EventGridMessageArgs CreateNew(EventGridMessage message, BlobMetadata blobMetadata)
        {
            return new EventGridMessageArgs
            {
                MessageId = Guid.NewGuid(),
                Message = message,
                BlobMetadata = blobMetadata
            };
        }
    }
}