/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Runtime.Serialization;

namespace FileEventService.Listeners
{
    [Serializable]
    public class ListenerException : Exception
    {
        public ListenerException()
        {
        }

        public ListenerException(string message) : base(message)
        {
        }

        public ListenerException(string message, Exception innerException) : base(message, innerException)
        {
        }

        protected ListenerException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}