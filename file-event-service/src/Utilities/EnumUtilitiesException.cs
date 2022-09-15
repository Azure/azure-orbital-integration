/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Runtime.Serialization;

namespace FileEventService.Utilities
{
    [Serializable]
    public class EnumUtilitiesException : Exception
    {
        public EnumUtilitiesException()
        {
        }

        public EnumUtilitiesException(string message) : base(message)
        {
        }

        public EnumUtilitiesException(string message, Exception innerException) : base(message, innerException)
        {
        }

        protected EnumUtilitiesException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}
