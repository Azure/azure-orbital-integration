// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { GetNextContactParams, makeOrbitalHelper } from '../orbitalHelper'
import { getEnvVar } from '@azure/orbital-integration-common'

const scheduleNextAvailableAndDisplay_cli = async () => {
    const orbitalHelper = await makeOrbitalHelper()
    const params: GetNextContactParams = {
        groundStationName: getEnvVar('GROUND_STATION_NAME'),
        spaceCraftName: getEnvVar('SPACECRAFT_NAME'),
        contactProfileName: getEnvVar('CONTACT_PROFILE_NAME'),
        minDurationMinutes: 5,
        maxDurationMinutes: 12,
    }
    const scheduleRes = await orbitalHelper.scheduleNextContact(params)
    if (scheduleRes) {
        const { contactName, summary } = scheduleRes
        console.log(JSON.stringify({ contactName, ...summary }, null, 2))
    } else {
        console.log(`Failed to find matching contact.`, JSON.stringify(params))
    }
}

/* --------------------------------------------------+
| Schedule next available contact.
| See: beginListAvailableContactsAndWait
| ℹ️ Current expected usage is listing all contacts
|    then manually selecting one then scheduling it
|    as a follow-on step.
|    Recommend `scheduleNextContact`.
+------------------------------------------------------*/

if (require.main === module) {
    scheduleNextAvailableAndDisplay_cli().catch((err) =>
        console.error(err.message)
    )
}
