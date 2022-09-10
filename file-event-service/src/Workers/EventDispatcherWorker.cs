/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FileEventService.Dispatchers;
using FileEventService.Listeners;
using FileEventService.Logging;
using FileEventService.Options;
using Microsoft.ApplicationInsights;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FileEventService.Workers
{
    internal class EventDispatcherWorker : IHostedService
    {
        private FileEventServiceOptions _options;
        private TelemetryClient _telemetryClient;
        private ILogger<EventDispatcherWorker> _logger;
        private readonly List<IEventDispatcher> _eventDispatchersList;
        private readonly CancellationToken _token;
        private static string _className = nameof(EventDispatcherWorker);

        public EventDispatcherWorker(FileEventServiceOptions options, IHostApplicationLifetime appLifetime, TelemetryClient telemetryClient, ILogger<EventDispatcherWorker> logger)
        {
            _options = options ?? throw new ArgumentNullException(nameof(options));
            _telemetryClient = telemetryClient ?? throw new ArgumentNullException(nameof(telemetryClient));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _eventDispatchersList = new List<IEventDispatcher>();

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
            var msg = "Starting all event dispatchers.";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);

            foreach (var eventDispatcherOptions in _options.EventDispatchers)
            {
                if (Enum.TryParse<EventDispatcherType>(eventDispatcherOptions.type.ToString(), true, out EventDispatcherType type))
                {
                    _eventDispatchersList.Add(EventDispatcherFactory.RegisterEventDispatcher(type, eventDispatcherOptions, _logger, _token));
                }
            }

            if (_eventDispatchersList.Any())
            {
                foreach (var dispatcher in _eventDispatchersList)
                {
                    await dispatcher.StartAsync().ConfigureAwait(false);
                }
            }
        }

        public async Task StopAsync(CancellationToken token)
        {
            var evt = $"{_className}::{nameof(StopAsync)}";
            var msg = "Stopping all dispatchers.";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);

            foreach (var dispatcher in _eventDispatchersList)
            {
                await dispatcher.StopAsync().ConfigureAwait(false);
            }
        }
    }
}