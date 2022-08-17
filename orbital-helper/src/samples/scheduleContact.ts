// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import {
    makeOrbitalHelper,
    MILLIS_PER_MINUTE,
    ScheduleContactParams,
} from '../orbitalHelper'
import { getEnvVar } from '../utils'

const scheduleContact_cli = async () => {
    const orbitalHelper = await makeOrbitalHelper()
    const reservationStartTime = new Date(Date.now() + MILLIS_PER_MINUTE * 15)
    const params: ScheduleContactParams = {
        spaceCraftName: getEnvVar('SPACECRAFT_NAME'),
        groundStationName: getEnvVar('GROUND_STATION_NAME'),
        contactProfileName: getEnvVar('CONTACT_PROFILE_NAME'),
        reservationStartTime,
        reservationEndTime: new Date(
            reservationStartTime.getTime() + MILLIS_PER_MINUTE * 1
        ),
    }
    console.log(
        'Scheduling test contact. params:',
        JSON.stringify(params, null, 2)
    )
    const res = await orbitalHelper.scheduleContact(params)
    console.log('Test contact scheduled:', JSON.stringify(res))
}

/*---------------------------------------------------------------------------+
| Schedule contact.
| ⚠️ Contact will fail (at down-link time) if spacecraft TLE is outdated.
|    Recommend either:
|       1) Automatically updating TLE (e.g. cron job)
|       2) Updating/looking up TLE when contact is scheduled.
|       3) Looking up TLE as contact executes.
|
| `contacts.beginCreateAndWait`
| When attempting to schedule invalid time window:
| ⚠️ Doesn't throw error.
| ⚠️ Doesn't populate `errorMessage`.
| ⚠️ Populates undocumented `error` property.
|
| ⚠️ Allows non-existent/Orbital inaccessible endpoints.
|    Consider (optionally?) validating connectivity of link channels at contact scheduling time.
|
| ℹ️ One of the args is a contact profile object with nested id.
|    Prefer `contactProfileName` so caller doesn't have to build
|    fully qualified ID.
|
| ℹ️ This returns a very large number of properties that are always null.
|    It does not return things that might be useful.
|    See `ContactSummary` for a more helpful return.
+----------------------------------------------------------------------------------*/

if (require.main === module) {
    scheduleContact_cli().catch((err) => console.error(err.message))
}
