/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.IO;

namespace FileEventService
{
    public static class Constants
    {
        public static Guid InstanceId = Guid.NewGuid();
        public static string ConfigTextFilePath = File.ReadAllText("./file-event-service.json");
        public const string RedactedSecretMask = "*****";
        public const int HeartbeatIntervalMs = 300000; // 5 minutes
    }
}