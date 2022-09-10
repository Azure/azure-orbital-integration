/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Collections.Generic;
using System.IO;
using FileEventService.Dispatchers.Options;

namespace FileEventService.Models
{
    public class FileMetadata
    {
        public FileMetadata() { }

        public FileMetadata(LocalFileSystemDispatcherOptions options, FileInfo fileInfo, Guid correlationId)
        {
            Name = options.Name;
            FileName = fileInfo.Name;
            DirectoryName = fileInfo.DirectoryName;
            FullFilePath = fileInfo.FullName;
            ContentLength = fileInfo.Exists ? fileInfo.Length : 0;
            PathToWatch = options.PathToWatch;
            IncludeSubDirectories = options.IncludeSubDirectories;
            Filters = options.Filters;
            AllowedEventTypes = options.AllowedEventTypes;
            CorrelationId = correlationId;
        }

        public string Name { get; set; }
        public string FileName { get; set; }
        public string DirectoryName { get; set; }
        public string FullFilePath { get; set; }
        public long ContentLength { get; set; }
        public string PathToWatch { get; set; }
        public bool IncludeSubDirectories { get; set; }
        public List<string> Filters { get; set; }
        public List<string> AllowedEventTypes { get; set; }
        public Guid CorrelationId { get; set; }
    }
}