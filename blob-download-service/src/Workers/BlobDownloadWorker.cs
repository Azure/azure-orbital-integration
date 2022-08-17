// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Microsoft.ApplicationInsights;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BlobDownloadService
{
    internal class BlobDownloadWorker : IHostedService
    {
        private BlobDownloadOptions _options;
        private TelemetryClient _telemetryClient;
        private ILogger<BlobDownloadWorker> _logger;
        private readonly Dictionary<string, IEventGridMessageReceiver> _receiverTrackingDict;
        private readonly CancellationToken _token;

        public BlobDownloadWorker(BlobDownloadOptions options, IHostApplicationLifetime appLifetime, TelemetryClient telemetryClient, ILogger<BlobDownloadWorker> logger)
        {
            _options = options ?? throw new ArgumentNullException(nameof(options));
            _telemetryClient = telemetryClient ?? throw new ArgumentNullException(nameof(telemetryClient));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _receiverTrackingDict = new Dictionary<string, IEventGridMessageReceiver>();

            var tokenSource = new CancellationTokenSource();
            _token = tokenSource.Token;

            var evt = $"{nameof(BlobDownloadWorker)}::.ctor";
            var msg = $"Initializing {nameof(BlobDownloadWorker)}";
            using var log = LogMessage.CreateNew(evt, msg, _logger);

            appLifetime.ApplicationStopping.Register(() =>
            {
                tokenSource.Cancel();
            });
        }

        private async Task StartReceiversAsync(List<IEventGridMessageReceiver> receivers)
        {
            foreach (var receiver in receivers)
            {
                _receiverTrackingDict.Add(Guid.NewGuid().ToString(), receiver);
                await receiver.StartReceiverAsync().ConfigureAwait(false);
            }
        }

        public async Task StartAsync(CancellationToken token)
        {
            var evt = $"{nameof(BlobDownloadWorker)}::{nameof(StartAsync)}";
            var msg = "Starting all receivers that are called out in the config...";
            using (var log = LogMessage.CreateNew(evt, msg, _logger))
            {
                List<IEventGridMessageReceiver> receiversToStart = new();
                if (_options.ServiceBusReceivers.Any())
                {
                    receiversToStart.AddRange(ReceiverFactory.GetReceiver(_options.ServiceBusReceivers, _logger, _token));
                }

                if (_options.EventHubReceivers.Any())
                {
                    receiversToStart.AddRange(ReceiverFactory.GetReceiver(_options.EventHubReceivers, _logger, _token));
                }

                if (receiversToStart.Any())
                {
                    await StartReceiversAsync(receiversToStart).ConfigureAwait(false);
                }

                log.ExtendedMessage = $"{receiversToStart.Count()} total receiver[s] started...";
            }
        }

        public async Task StopAsync(CancellationToken token)
        {
            var evt = $"{nameof(BlobDownloadWorker)}::{nameof(StopAsync)}";
            var msg = "Stopping all receivers...";
            using (var log = LogMessage.CreateNew(evt, msg, _logger))
            {
                foreach (var receiver in _receiverTrackingDict.Values)
                {
                    await receiver.StopReceiverAsync().ConfigureAwait(false);
                }
            }

            // After the app is stopped we need to make sure we flush log messages and wait
            // Docs: https://docs.microsoft.com/en-us/azure/azure-monitor/app/console#feedback
            await _telemetryClient.FlushAsync(CancellationToken.None).ConfigureAwait(false);
            await Task.Delay(5000);
        }
    }
}