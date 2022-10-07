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
            RelativeFilePath = GetRelativeFilePath(options.PathToWatch, fileInfo.FullName);
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
        public string RelativeFilePath { get; set; }
        public long ContentLength { get; set; }
        public string PathToWatch { get; set; }
        public bool IncludeSubDirectories { get; set; }
        public List<string> Filters { get; set; }
        public List<string> AllowedEventTypes { get; set; }
        public Guid CorrelationId { get; set; }

        /// <summary>
        /// Provides the full file path relative to the path to watch. This
        /// will maintain directory structure when working with a given file.
        /// In the scenario that the pathToWatch is /d1 and the file that gets
        /// created is /d1/d2/file.ext, the result will be /d2/file.ext.
        /// </summary>
        private string GetRelativeFilePath(string pathToWatch, string fullfilePath)
        {
            // Strip off the period when a relative path is specified, i.e.
            // ./d1 becomes /d1
            if (pathToWatch.StartsWith('.'))
            {
                pathToWatch = pathToWatch.Substring(1, pathToWatch.Length - 1);
            }

            // Split on the pathToWatch and take the second value,
            // maintaining relative directory structure.
            return fullfilePath.Split(pathToWatch)[1];
        }
    }
}
