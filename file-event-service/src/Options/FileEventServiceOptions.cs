/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

namespace FileEventService.Options
{
    public class FileEventServiceOptions
    {
        public string EnvironmentName { get; set; }
        public dynamic[] EventListeners { get; set; }
        public dynamic[] EventDispatchers { get; set; }
    }
}