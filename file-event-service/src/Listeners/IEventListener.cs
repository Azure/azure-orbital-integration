/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System.Threading.Tasks;

namespace FileEventService.Listeners
{
    public interface IEventListener
    {
        /// <summary>
        /// Starts listener to start listening for events.
        /// </summary>
        /// <returns></returns>
        Task StartAsync();

        /// <summary>
        /// Stops listener to stop listening to events.
        /// </summary>
        /// <returns></returns>
        Task StopAsync();
    }
}
