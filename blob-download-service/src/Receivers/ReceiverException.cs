// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using System.Runtime.Serialization;

namespace BlobDownloadService
{
    [Serializable]
    public class ReceiverException : Exception
    {
        public ReceiverException()
        {
        }

        public ReceiverException(string? message) : base(message)
        {
        }

        public ReceiverException(string? message, Exception? innerException) : base(message, innerException)
        {
        }

        protected ReceiverException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}