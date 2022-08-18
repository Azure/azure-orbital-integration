// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { getEndpointFromEnv, makeOrbitalHelper } from '../orbitalHelper'
import { getEnvVar } from '../utils'

const createContactProfile_cli = async () => {
    const { createContactProfile } = await makeOrbitalHelper()
    const { endpointName, endpointIP, endpointPort, subnetId } =
        getEndpointFromEnv()
    const res = await createContactProfile({
        name: getEnvVar('CONTACT_PROFILE_NAME'),
        endpointName,
        endpointIP,
        endpointPort,
        subnetId,
    })
    console.log(
        'Created/updated contact profile:',
        JSON.stringify(res, null, 2)
    )
}

/*--------------------------------------------------------------------------------------------+
| Create contact profile.
|
| ⚠️ The 4th un-named argument which is of type `ContactProfilesCreateOrUpdateOptionalParams`
|    is not optional, unlike its name implies. An error is thrown if it is missing
|    or an empty object (which is valid per type since all properties are optional).
|    Recommend making required params & required props of the type required.
|
| ⚠️ Allows non-existent/Orbital inaccessible endpoints.
|    Consider (optionally?) validating connectivity of link channels at contact profile creation time.
|
| ℹ️ fx(string, string, string, ...) is an anti-pattern.
|    The order of the arguments is arbitrary. When using this
|    library, the compiler can't help prevent order mix-ups and
|    a code reviewers are extremely unlikely to notice.
|    Recommend a single argument (named params).
|    i.e. beginCreateOrUpdateAndWait({
|            profileName,
|            location,
|            resourceGroup,
|            minimumViableContactDuration,
|            tags,
|         })
+---------------------------------------------------------------------------------------------*/

if (require.main === module) {
    createContactProfile_cli().catch((err) => console.error(err.message))
}
