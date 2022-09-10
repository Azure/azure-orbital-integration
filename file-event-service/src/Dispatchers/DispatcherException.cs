/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Runtime.Serialization;

namespace FileEventService.Dispatchers
{
    [Serializable]
    public class DispatcherException : Exception
    {
        public DispatcherException()
        {
        }

        public DispatcherException(string message) : base(message)
        {
        }

        public DispatcherException(string message, Exception innerException) : base(message, innerException)
        {
        }

        protected DispatcherException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}