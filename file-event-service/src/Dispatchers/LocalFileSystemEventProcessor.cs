/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using FileEventService.Actions;
using FileEventService.Logging;
using FileEventService.Models;
using Microsoft.Extensions.Logging;

namespace FileEventService
{
    public class LocalFileSystemEventProcessor : IDisposable
    {
        private Thread _worker;
        private EventWaitHandle _eventWaitHandle;
        ConcurrentQueue<EventGridMessage> _eventGridEventQueue;
        private List<IEventAction> _actionsList;
        private ILogger _logger;
        private string _name;
        private CancellationToken _token;
        private static string _className = nameof(LocalFileSystemEventProcessor);

        public LocalFileSystemEventProcessor(List<IEventAction> actionsList, ILogger logger, string name, CancellationToken token)
        {
            _actionsList = actionsList;
            _logger = logger;
            _name = name;
            _token = token;
            _eventWaitHandle = new AutoResetEvent(false);
            _eventGridEventQueue = new ConcurrentQueue<EventGridMessage>();

            _worker = new Thread(Worker);
            _worker.Start();

            _token.Register(() => Dispose());
        }

        public void EnqueueEventGridEvent(EventGridMessage eventGridMessage)
        {
            _eventGridEventQueue.Enqueue(eventGridMessage);
            _eventWaitHandle.Set();
        }

        private void Worker()
        {
            var evt = $"{_className}::{nameof(Worker)}";
            var msg = $"Starting worker.";
            var log = LogMessage.CreateNew(evt, msg, _name);
            log.Write(_logger);

            while (!_token.IsCancellationRequested)
            {
                if (!_eventGridEventQueue.TryDequeue(out EventGridMessage eventGridMessage))
                {
                    _eventWaitHandle.WaitOne();
                }
                else
                {
                    ProcessEvent(eventGridMessage);
                }
            }

            evt = $"{_className}::{nameof(Worker)}";
            msg = $"Ending worker.";
            log = LogMessage.CreateNew(evt, msg, _name);
            log.Write(_logger);
        }

        private void ProcessEvent(EventGridMessage eventGridMessage)
        {
            var correlationId = eventGridMessage.ExtractCorrelationId();
            var evt = $"{_className}::{nameof(Worker)}";
            var msg = "Starting the handling of FileSystemWatcher event.";
            var sw = Stopwatch.StartNew();
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

            try
            {    
                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                foreach (var action in _actionsList)
                {
                    action.ProcessEventAsync(eventGridMessage, correlationId, _token).GetAwaiter().GetResult();
                }

                log.EventRuntimeMs = sw.ElapsedMilliseconds;
                log.Message = $"Ending the handling of FileSystemWatcher event.";
                log.Write(_logger);
            }
            catch (EventActionException ex)
            {
                log.Message = ex.Message;
                log.LogLevel = LogLevel.Error;
                log.Exception = ex;
                log.Write(_logger);
            }
        }

        public void Dispose()
        {
            // Send the signal to the waiting thread to proceed. This
            // will trigger Work to allow it to clean up the thread cleanly.
            _eventWaitHandle.Set();
            _worker.Join();
            _eventWaitHandle.Dispose();
            _worker = null;
        }
    }
}