/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

namespace FileEventService.Actions
{
    public enum DispatcherEventActionType
    {
        SendEventGridEvent,
        ExecuteScript,
        BlobUpload
    }
}
