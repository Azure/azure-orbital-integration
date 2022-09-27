// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import {
    CheckRequiredResources,
    Env,
    ListSpacecrafts,
    SearchContacts,
} from '../preload'

export const makeAPI = () => {
    return {
        //@ts-ignore
        searchContacts: window.api?.searchContacts as SearchContacts,
        //@ts-ignore
        checkRequiredResources: window.api
            ?.checkRequiredResources as CheckRequiredResources,
        //@ts-ignore
        listSpacecrafts: window.api?.listSpacecrafts as ListSpacecrafts,
        //@ts-ignore
        getEnv: () => window.api?.env as Env,
    }
}
