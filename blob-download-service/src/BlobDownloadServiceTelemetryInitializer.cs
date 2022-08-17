// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

using System.Reflection;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;

namespace BlobDownloadService
{
    public class BlobDownloadServiceTelemetryInitializer : ITelemetryInitializer
    {
        private const string _languageKey = "Language";
        private const string _environmentNameKey = "EnvironmentName";
        private const string _languageValue = "C#";
        private const string _languageVersionKey = "LanguageVersion";
        private const string _primaryCorrelationIdKey = "PrimaryCorrelationId";
        private const string _envVarHostname = "HOSTNAME";
        private readonly string _environment;
        private readonly Guid _primaryCorrelationId = Guid.NewGuid();
        private static readonly string _version = $"{Assembly.GetEntryAssembly()?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion}";

        public BlobDownloadServiceTelemetryInitializer(BlobDownloadOptions options)
        {
            _environment = options.EnvironmentName ?? Environment.GetEnvironmentVariable(_envVarHostname) ?? String.Empty;
        }

        public void Initialize(ITelemetry telemetry)
        {
            if (telemetry == null)
            {
                throw new ArgumentNullException(nameof(telemetry));
            }

            telemetry.Context.GlobalProperties[_languageKey] = _languageValue;
            telemetry.Context.GlobalProperties[_environmentNameKey] = _environment;
            telemetry.Context.GlobalProperties[_languageVersionKey] = Environment.Version.ToString();
            telemetry.Context.GlobalProperties[_primaryCorrelationIdKey] = _primaryCorrelationId.ToString();
            telemetry.Context.Component.Version = _version;
        }
    }
}