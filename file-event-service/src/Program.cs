/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Threading;
using System.Threading.Tasks;
using FileEventService.Options;
using FileEventService.Utilities;
using FileEventService.Workers;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FileEventService
{
    public class Program
    {
        public static void Main(string[] args)
        {
            IHost host = Host.CreateDefaultBuilder(args)
                .ConfigureServices((hostContext, services) =>
                {
                    var environmentName = InitConfiguration(services, hostContext);
                    InitLogging(services, environmentName);
                    services.AddHostedService<EventListenerWorker>();
                    services.AddHostedService<EventDispatcherWorker>();
                    services.AddHostedService<HeartbeatWorker>();
                })
                .Build();

            RegisterAppCleanupTasks(host);

            host.Run();
        }

        private static void RegisterAppCleanupTasks(IHost host)
        {
            var appLifetime = host.Services.GetService<IHostApplicationLifetime>();
            var telemetryClient = host.Services.GetService<TelemetryClient>();

            appLifetime.ApplicationStopped.Register(() =>
            {
                // After the app is stopped we need to make sure we flush log messages and wait
                // Docs: https://docs.microsoft.com/en-us/azure/azure-monitor/app/console#feedback
                telemetryClient.FlushAsync(CancellationToken.None).GetAwaiter().GetResult();
                Task.Delay(5000).GetAwaiter().GetResult();
            });
        }

        private static string InitConfiguration(IServiceCollection services, HostBuilderContext hostContext)
        {
            FileEventServiceOptions config = ConfigUtils.GetFileEventServiceOptions();
            services.AddSingleton(config);

            return config.EnvironmentName;
        }

        private static void InitLogging(IServiceCollection services, string environmentName)
        {
            services.AddApplicationInsightsTelemetryWorkerService(c => { c.EnableAdaptiveSampling = false; });
            services.Configure<TelemetryConfiguration>(c =>
            {
                c.TelemetryInitializers.Add(new FileEventServiceTelemetryInitializer(environmentName));
            });

            // Disable Application Insights tracing messages to avoid very noisy debug output
            Microsoft.ApplicationInsights.Extensibility.Implementation.TelemetryDebugWriter.IsTracingDisabled = true;

            services.AddLogging(c =>
            {
                c.AddConsole();
                c.AddApplicationInsights();
            });
        }
    }
}
