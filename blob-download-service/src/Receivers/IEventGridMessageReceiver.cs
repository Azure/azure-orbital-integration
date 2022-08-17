// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

namespace BlobDownloadService
{
    public interface IEventGridMessageReceiver
    {
        Task StartReceiverAsync();
        Task StopReceiverAsync();
    }
}