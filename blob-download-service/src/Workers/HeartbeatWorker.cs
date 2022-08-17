// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using System.Timers;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BlobDownloadService
{
    public class HeartbeatWorker : IHostedService
    {
        private ILogger<HeartbeatWorker> _logger;
        private HeartbeatOptions _options;
        private System.Timers.Timer _heartbeatTimer;

        public HeartbeatWorker(ILogger<HeartbeatWorker> logger)
        {
            _logger = logger;
            _options = new HeartbeatOptions();

            var evt = $"{nameof(HeartbeatWorker)}::.ctor";
            var msg = $"Initializing {nameof(HeartbeatWorker)}ms";
            using (var log = LogMessage.CreateNew(evt, msg, _logger))
            {
                log.ExtendedMessage = _options.ToString();
            }

            _heartbeatTimer = new System.Timers.Timer(_options.HeartbeatIntervalMs);
            _heartbeatTimer.Elapsed += Heartbeat;
        }

        private void Heartbeat(object? sender, ElapsedEventArgs e)
        {
            var evt = $"{nameof(HeartbeatWorker)}::{nameof(Heartbeat)}";
            var msg = $"Heartbeat for interval {String.Format("{0:n0}", _options.HeartbeatIntervalMs)}ms";
            using var log = LogMessage.CreateNew(evt, msg, _logger);
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            var evt = $"{nameof(HeartbeatWorker)}::{nameof(StartAsync)}";
            var msg = $"Starting {nameof(Heartbeat)}...";
            using var log = LogMessage.CreateNew(evt, msg, _logger);

            _heartbeatTimer.Start();
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            var evt = $"{nameof(HeartbeatWorker)}::{nameof(StopAsync)}";
            var msg = $"Stopping {nameof(Heartbeat)}...";
            using var log = LogMessage.CreateNew(evt, msg, _logger);

            _heartbeatTimer.Stop();
            _heartbeatTimer.Dispose();
            return Task.CompletedTask;
        }
    }
}