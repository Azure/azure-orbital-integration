/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;
using FileEventService.Logging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FileEventService.Workers
{
    public class HeartbeatWorker : IHostedService
    {
        private ILogger<HeartbeatWorker> _logger;
        private System.Timers.Timer _heartbeatTimer;
        private static string _className = nameof(HeartbeatWorker);

        public HeartbeatWorker(ILogger<HeartbeatWorker> logger)
        {
            _logger = logger;

            var evt = $"{_className}::.ctor";
            var msg = $"Initializing {_className}.";
            var log = LogMessage.CreateNew(evt, msg);

            log.ExtendedMessage = $"Heartbeat interval {Constants.HeartbeatIntervalMs}ms";
            log.Write(_logger);

            _heartbeatTimer = new System.Timers.Timer(Constants.HeartbeatIntervalMs);
            _heartbeatTimer.Elapsed += Heartbeat;
        }

        private void Heartbeat(object sender, ElapsedEventArgs e)
        {
            var evt = $"{nameof(_className)}::{nameof(Heartbeat)}";
            var msg = $"Heartbeat for interval {String.Format("{0:n0}", Constants.HeartbeatIntervalMs)}ms";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            var evt = $"{_className}::{nameof(StartAsync)}";
            var msg = "Starting heartbeat.";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);

            _heartbeatTimer.Start();
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            var evt = $"{_className}::{nameof(StartAsync)}";
            var msg = "Stopping heartbeat.";
            var log = LogMessage.CreateNew(evt, msg);
            log.Write(_logger);

            _heartbeatTimer.Stop();
            _heartbeatTimer.Dispose();
            return Task.CompletedTask;
        }
    }
}
