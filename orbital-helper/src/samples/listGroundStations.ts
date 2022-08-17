// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { AzureOrbital } from '@azure/arm-orbital'
import { DefaultAzureCredential } from '@azure/identity'
import { getEnvVar } from '../utils'

const listGroundStations_cli = async () => {
    const orbitalClient = new AzureOrbital(
        new DefaultAzureCredential(),
        getEnvVar('AZ_SUBSCRIPTION')
    )
    for await (const {
        name,
        city,
    } of orbitalClient.availableGroundStations.listByCapability(
        'EarthObservation' // Where do we find list of valid capabilities?
    )) {
        console.log(JSON.stringify({ name, city }, null, 2))
    }
}

/* ----------------------------------------------------------------+
| List ground stations.
| ℹ️ Users attempting to schedule contacts need to know
|    which ground station (code).
|    A simple `listGroundStations` would be helpful.
|
|    `listByCapability` requires that users know the enumeration of
|     valid 'capabilities', which they likely don't.
|     arg[0] of `listByCapability` is type 'string' which doesn't help.
|
|    Recommend `searchGroundStations` which takes optional params
|    such as capability, location, etc.
+---------------------------------------------------------------------*/

if (require.main === module) {
    listGroundStations_cli().catch((err) => console.error(err.message))
}
