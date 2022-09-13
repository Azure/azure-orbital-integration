/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure.Messaging.EventGrid;
using FileEventService.Dispatchers.Options;
using FileEventService.Logging;
using FileEventService.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace FileEventService.Dispatchers
{
    public class LocalFileSystemEventDispatcher : BaseEventDispatcher
    {
        private List<FileSystemWatcher> _fileSystemWatchers;
        private string _name;
        private LocalFileSystemDispatcherOptions _options;
        private ILogger _logger;
        private LocalFileSystemEventProcessor _eventProcessor;
        private CancellationToken _token;
        private static string _className = nameof(LocalFileSystemEventDispatcher);

        internal static IEventDispatcher Register(LocalFileSystemDispatcherOptions options, ILogger logger, CancellationToken token)
        {
            var evt = $"{_className}::{nameof(Register)}";
            var msg = $"Registering '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, options.Name);

            log.ExtendedMessage = options.AsJsonSerializedString();
            log.Write(logger);

            return new LocalFileSystemEventDispatcher
            {
                _options = options,
                _name = options.Name,
                _logger = logger,
                _token = token,
                _fileSystemWatchers = new List<FileSystemWatcher>(),
            };
        }

        public override Task StartAsync()
        {
            var evt = $"{_className}::{nameof(StopAsync)}";
            var msg = $"Starting '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, _name);
            log.Write(_logger);

            RegisterActions(_options.Actions, _options.Name, _logger);
            _eventProcessor = new LocalFileSystemEventProcessor(ActionsList, _logger, _name, _token);

            if (!Directory.Exists(_options.PathToWatch)) Directory.CreateDirectory(_options.PathToWatch);

            FileSystemWatcher fsw = new FileSystemWatcher(_options.PathToWatch)
            {
                InternalBufferSize = 64 * 1024,
                EnableRaisingEvents = true,
                IncludeSubdirectories = _options.IncludeSubDirectories,
                NotifyFilter = NotifyFilters.FileName
            };

            fsw.BeginInit();
            _options.Filters.ForEach(x => fsw.Filters.Add(x));
            fsw.Created += OnEvent;
            fsw.Deleted += OnEvent;
            fsw.Changed += OnEvent;
            fsw.Renamed += OnRenamed;
            fsw.Error += OnError;
            fsw.EndInit();
            _fileSystemWatchers.Add(fsw);

            return Task.CompletedTask;
        }

        private void OnError(object sender, ErrorEventArgs e)
        {
            var evt = $"{_className}::{nameof(OnError)}";
            var msg = e.GetException().Message;
            var log = LogMessage.CreateNew(evt, msg, _name);

            var exception = new DispatcherException(e.GetException().Message, e.GetException());
            log.LogLevel = LogLevel.Error;
            log.Exception = exception;
            log.Write(_logger);
        }

        private void OnEvent(object sender, FileSystemEventArgs e)
        {
            var correlationId = Guid.NewGuid();
            FileMetadata metadata = new FileMetadata(_options, _fileInfo(e.FullPath), correlationId);
            var eventGridMessage = BuidlEventGridMessage(e.FullPath, e.ChangeType.ToString(), metadata);

            if (_options.AllowedEventTypes.Contains(eventGridMessage.EventType))
            {
                var evt = $"{_className}::{nameof(OnEvent)}";
                var msg = $"Queuing event of type '{eventGridMessage.EventType}'.";
                var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                _eventProcessor.EnqueueEventGridEvent(eventGridMessage);
            }
        }

        private void OnRenamed(object sender, RenamedEventArgs e)
        {
            var correlationId = Guid.NewGuid();
            RenamedFileMetadata metadata = new RenamedFileMetadata(_options, _fileInfo(e.FullPath), correlationId, e.OldName, e.OldFullPath);
            var eventGridMessage = BuidlEventGridMessage(e.FullPath, e.ChangeType.ToString(), metadata);
            var serialized = JsonConvert.SerializeObject(eventGridMessage);
            if (_options.AllowedEventTypes.Contains(eventGridMessage.EventType))
            {
                var evt = $"{_className}::{nameof(OnEvent)}";
                var msg = $"Queuing event of type '{eventGridMessage.EventType}'.";
                var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                _eventProcessor.EnqueueEventGridEvent(eventGridMessage);
            }
        }

        private FileInfo _fileInfo(string path)
            => new FileInfo(path);

        private EventGridMessage BuidlEventGridMessage(string fullFilePath, string eventType, dynamic data)
        {
            eventType = $"Local.FileSystem.{eventType}";
            EventGridEvent eventGridEvent =
                    new EventGridEvent(
                        subject: fullFilePath,
                        eventType: eventType,
                        dataVersion: "v1",
                        data: data);

            return EventGridMessage.FromEventGridEvent(eventGridEvent);
        }

        public override Task StopAsync()
        {
            var evt = $"{_className}::{nameof(StopAsync)}";
            var msg = $"Stopping '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, _name);
            log.Write(_logger);

            foreach (var fileSystemWatcher in _fileSystemWatchers)
            {
                fileSystemWatcher.EnableRaisingEvents = false;
                fileSystemWatcher.Dispose();
            }

            return Task.CompletedTask;
        }
    }
}
