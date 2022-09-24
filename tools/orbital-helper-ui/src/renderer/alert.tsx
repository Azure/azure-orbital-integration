// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { h } from 'preact'

export type AlertType = 'info' | 'success' | 'warning' | 'danger'
export type AlertMessage = string | h.JSX.Element
export interface AlertParams {
    type: AlertType
    message: AlertMessage
}

export const Alert = ({ message, type }: AlertParams) => {
    if (!message) {
        return null
    }
    return (
        <div className={`alert alert-${type}`} role="alert">
            {message}
        </div>
    )
}
