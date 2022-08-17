// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BlobDownloadService
{
    public class Program
    {
        public static void Main(string[] args)
        {
            IHost host = Host.CreateDefaultBuilder(args)
                .ConfigureServices((hostContext, services) =>
                {
                    var blobDownloadOptions = InitConfiguration(services, hostContext);
                    InitLogging(services, blobDownloadOptions);
                    services.AddHostedService<BlobDownloadWorker>();
                    services.AddHostedService<HeartbeatWorker>();
                })
                .Build();

            host.Run();
        }

        private static BlobDownloadOptions InitConfiguration(IServiceCollection services, HostBuilderContext context)
        {
            IConfiguration configuration = context.Configuration;
            BlobDownloadOptions blobDownloadOptions = new BlobDownloadOptions();
            configuration.Bind("blobDownloadOptions", blobDownloadOptions);
            services.AddSingleton(blobDownloadOptions);

            return blobDownloadOptions;
        }

        private static void InitLogging(IServiceCollection services, BlobDownloadOptions options)
        {
            services.AddApplicationInsightsTelemetryWorkerService(c => { c.EnableAdaptiveSampling = false; });
            services.Configure<TelemetryConfiguration>(c =>
            {
                c.TelemetryInitializers.Add(new BlobDownloadServiceTelemetryInitializer(options));
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