/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.IO;
using FileEventService.Dispatchers.Options;
using FileEventService.Models;

namespace FileEventService.Dispatchers
{
    public class RenamedFileMetadata : FileMetadata
    {
        public RenamedFileMetadata() { }

        public RenamedFileMetadata(LocalFileSystemDispatcherOptions options, FileInfo fileInfo, Guid correlationId, string oldName, string oldFullPath)
            : base(options, fileInfo, correlationId)
        {
            OldName = oldName;
            OldFullPath = oldFullPath;
        }

        public string OldName { get; set; }
        public string OldFullPath { get; set; }
    }
}