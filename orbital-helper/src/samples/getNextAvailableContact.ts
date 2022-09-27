// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { makeOrbitalHelper } from '../orbitalHelper'
import {
    getEnvVar,
    getOptionalNumericEnvVar,
} from '@azure/orbital-integration-common'

const getNextContact_cli = async () => {
    const orbitalHelper = await makeOrbitalHelper()
    const nextContactRes = await orbitalHelper.getNextContact({
        spaceCraftName: getEnvVar('SPACECRAFT_NAME'), // Required
        groundStationName: getEnvVar('GROUND_STATION_NAME'), // Required
        contactProfileName: getEnvVar('CONTACT_PROFILE_NAME'), // Required
        maxDurationMinutes:
            getOptionalNumericEnvVar('CONTACT_MAX_DURATION') ?? 12, // Required
        minDurationMinutes: getOptionalNumericEnvVar('CONTACT_MIN_DURATION'), // Optional
        minMinutesFromNow: getOptionalNumericEnvVar(
            'CONTACT_MIN_MINUTES_FROM_NOW'
        ), // Optional
        maxMinutesFromNow: getOptionalNumericEnvVar(
            'CONTACT_MAX_MINUTES_FROM_NOW'
        ), // Optional
    })
    console.log(
        'Next available contact:',
        !nextContactRes ? null : JSON.stringify(nextContactRes, null, 2)
    )
}

/* ----------------------------------------------------------------+
| Get next available contact.
|
| ℹ️ `spacecrafts.beginListAvailableContactsAndWait`
|    One of the args of list available contacts is a contact profile
|    object with an `id` property. User must either look it up or
|    construct the fully qualified identifier string.
|    Prefer: `contactProfileName`
|
| ℹ️ Current expected usage is listing all contacts.
|    Recommend `searchAvailableContacts`.
+--------------------------------------------------------------------*/

if (require.main === module) {
    getNextContact_cli().catch((err) => console.error(err.message))
}
