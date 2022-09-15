/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FileEventService.Listeners;
using FileEventService.Logging;
using FileEventService.Options;
using Microsoft.ApplicationInsights;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FileEventService.Workers
{
    internal class EventListenerWorker : IHostedService
    {
        private FileEventServiceOptions _options;
        private TelemetryClient _telemetryClient;
        private ILogger<EventListenerWorker> _logger;
        private readonly List<IEventListener> _eventListenersList;
        private readonly CancellationToken _token;
        private static string _className = nameof(EventListenerWorker);

        public EventListenerWorker(FileEventServiceOptions options, IHostApplicationLifetime appLifetime, TelemetryClient telemetryClient, ILogger<EventListenerWorker> logger)
        {
            _options = options ?? throw new ArgumentNullException(nameof(options));
            _telemetryClient = telemetryClient ?? throw new ArgumentNullException(nameof(telemetryClient));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _eventListenersList = new List<IEventListener>();

            var tokenSource = new CancellationTokenSource();
            _token = tokenSource.Token;

            var evt = $"{_className}::.ctor";
            var msg = $"Initializing {_className}.";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);

            appLifetime.ApplicationStopping.Register(() =>
            {
                tokenSource.Cancel();
            });
        }

        public async Task StartAsync(CancellationToken token)
        {
            var evt = $"{_className}::{nameof(StartAsync)}";
            var msg = "Starting all listeners.";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);

            foreach (var eventListenerOptions in _options.EventListeners)
            {
                if (Enum.TryParse<EventListenerType>(eventListenerOptions.type.ToString(), true, out EventListenerType type))
                {
                    _eventListenersList.Add(EventListenerFactory.RegisterEventListener(type, eventListenerOptions, _logger, _token));
                }
            }

            if (_eventListenersList.Any())
            {
                foreach (var listener in _eventListenersList)
                {
                    await listener.StartAsync().ConfigureAwait(false);
                }
            }
        }

        public async Task StopAsync(CancellationToken token)
        {
            var evt = $"{_className}::{nameof(StopAsync)}";
            var msg = "Stopping all listeners.";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);

            foreach (var listener in _eventListenersList)
            {
                await listener.StopAsync().ConfigureAwait(false);
            }
        }
    }
}
