/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Runtime.Serialization;

namespace FileEventService.Actions
{
    [Serializable]
    public class EventActionException : Exception
    {
        public EventActionException()
        {
        }

        public EventActionException(string message) : base(message)
        {
        }

        public EventActionException(string message, Exception innerException) : base(message, innerException)
        {
        }

        protected EventActionException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}