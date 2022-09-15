/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Reflection;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;

namespace FileEventService
{
    public class FileEventServiceTelemetryInitializer : ITelemetryInitializer
    {
        private const string _languageKey = "Language";
        private const string _environmentNameKey = "EnvironmentName";
        private const string _languageValue = "C#";
        private const string _languageVersionKey = "LanguageVersion";
        private const string _instanceIdKey = "InstanceId";
        private const string _envVarHostname = "HOSTNAME";
        private readonly string _environment;
        private static readonly string _version = $"{Assembly.GetEntryAssembly()?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion}";

        public FileEventServiceTelemetryInitializer(string environmentName)
        {
            _environment = environmentName ?? Environment.GetEnvironmentVariable(_envVarHostname) ?? String.Empty;
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
            telemetry.Context.GlobalProperties[_instanceIdKey] = Constants.InstanceId.ToString();
            telemetry.Context.Component.Version = _version;
        }
    }
}
