/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System.Threading.Tasks;

namespace FileEventService.Dispatchers
{
    public interface IEventDispatcher
    {
        Task StartAsync();
        Task StopAsync();
    }
}
