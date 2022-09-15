/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Diagnostics;
using System.Threading.Tasks;
using FileEventService.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FileEventService.Logging;
using System.Threading;

namespace FileEventService.Actions
{
    public class ScriptEventAction : IEventAction
    {
        private ScriptEventActionOptions _options;
        private string _name;
        private ILogger _logger;
        private Process _process;
        private static string _className = nameof(ScriptEventAction);

        public static IEventAction Register(ScriptEventActionOptions options, string name, ILogger logger)
        {
            var evt = $"{_className}::{nameof(Register)}";
            var msg = $"Registering '{_className}'.";
            var log = LogMessage.CreateNew(evt, msg, name);

            log.ExtendedMessage = options.AsJsonSerializedString();
            log.Write(logger);

            return new ScriptEventAction
            {
                _options = options,
                _name = name,
                _logger = logger
            };
        }

        private void OnExit(object sender, EventArgs e)
        {
            Guid.TryParse(_process.StartInfo.EnvironmentVariables["CORRELATION_ID"], out Guid correlationId);
            var evt = $"{_className}::{nameof(OnExit)}";
            var msg = $"Exiting script execution.";
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

            log.ExtendedMessage = $"STDOUT: {_process.StandardOutput.ReadToEnd()}";

            if (_process.ExitCode != 0)
            {
                log.ExtendedMessage = $"STDERR: {_process.StandardError.ReadToEnd()}";
                var exception = new EventActionException($"The script '{_process.StartInfo.FileName}' with arguments '{String.Join(" ", _process.StartInfo.ArgumentList)}', exited with code '{_process.ExitCode}'");
                log.LogLevel = LogLevel.Error;
                log.Exception = exception;
            }

            log.Write(_logger);
        }

        public Task ProcessEventAsync(EventGridMessage eventGridMessage, Guid correlationId, CancellationToken token)
        {
            var evt = $"{_className}::{nameof(ProcessEventAsync)}";
            var msg = $"Starting script execution: '{_options.Filename}' with arguments '{String.Join(" ", _options.Arguments)}'.";
            var sw = Stopwatch.StartNew();
            var log = LogMessage.CreateNew(evt, msg, _name, correlationId);

            try
            {
                eventGridMessage.Data.test = "";
                log.ExtendedMessage = eventGridMessage;
                log.Write(_logger);

                using (var process = new Process())
                {
                    process.EnableRaisingEvents = true;
                    process.Exited += OnExit;
                    process.ErrorDataReceived += OnError;

                    var startInfo = new ProcessStartInfo
                    {
                        FileName = _options.Filename,
                        Arguments = _options.Arguments,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        WorkingDirectory = _options.WorkingDirectory,
                    };

                    startInfo.EnvironmentVariables.Add("FES_EVENT_GRID_EVENT", JsonConvert.SerializeObject(eventGridMessage, Formatting.None));
                    startInfo.EnvironmentVariables.Add("CORRELATION_ID", correlationId.ToString());
                    process.StartInfo = startInfo;

                    _process = process;
                    _process.Start();
                    _process.WaitForExit();
                }

                log.EventRuntimeMs = sw.ElapsedMilliseconds;
                log.Message = $"Ending script execution.";
                log.Write(_logger);
            }
            catch (Exception ex)
            {
                var exception = new EventActionException($"Unable to execute script, inner exception: {ex.Message}", ex);
                log.Message = exception.Message;
                log.LogLevel = LogLevel.Error;
                log.Exception = exception;
                log.Write(_logger);
            }

            return Task.CompletedTask;
        }

        private void OnError(object sender, DataReceivedEventArgs e)
        {
            var evt = $"{_className}::{nameof(OnError)}";
            var msg = $"Error during script execution for '{_name}'.";
            var log = LogMessage.CreateNew(evt, msg, _name);

            var exception = new EventActionException(e.Data);
            log.LogLevel = LogLevel.Error;
            log.Exception = exception;
            log.Write(_logger);

            throw exception;
        }
    }
}
