// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { makeOrbitalHelper } from '../orbitalHelper'
import { getEnvVar } from '../utils'

const updateTLE_cli = async () => {
    const orbitalHelper = await makeOrbitalHelper()
    const spacecraftName = getEnvVar('SPACECRAFT_NAME')
    console.log(`Updating TLE for '${spacecraftName}'.`)
    const res = await orbitalHelper.updateTLE({
        spacecraftName,
    })
    console.log(
        `Updated TLE for '${spacecraftName}' to:`,
        JSON.stringify(res, null, 2)
    )
}

/*-----------------------------------------------------------------+
| Update spacecraft.
| `spacecrafts.beginCreateOrUpdateAndWait`
| ⚠️ It's unlikely users will figure out how to update successfully because type definitions don't match required properties for  spacecraft updating.
|  • `SpacecraftsCreateOrUpdateOptionalParams`: Is not optional despite it name.
|  • None of the `SpacecraftsCreateOrUpdateOptionalParams` are defined as being required, even though they are required for both create and update.
|  • When a user attempts to update the TLE, by only specifying the TLE-related "optional params", a misleading error is thrown indicating the user must delete and re-create the spacecraft.
|  • The API is illogical. If a user is only intending to update the TLE, they should not be required to also provide the `links` and `noradId` (as they do now). This is an un-documented, counterintuitive requirement that deviates from the type definition).
|
| ℹ️ Create has different allowed/required params than update.
|    Recommend splitting `beginCreateOrUpdateAndWait` into 2 functions
|    with properly matching types for allowed/required params.
+-------------------------------------------------------------------*/

if (require.main === module) {
    updateTLE_cli().catch((err) =>
        console.error('Error updating spacecraft: ' + err.message)
    )
}
