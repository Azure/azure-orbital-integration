// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import {
    makeOrbitalHelper,
    SearchScheduledContactsParams,
} from '../orbitalHelper'
import { getEnvVar, getOptionalEnvVar } from '@azure/orbital-integration-common'

const rangeMillis = 90_000
const plusOrMinus = (_date: Date | undefined) => ({
    noLaterThan: _date ? new Date(_date.getTime() + rangeMillis) : undefined,
    noEarlierThan: _date ? new Date(_date.getTime() - rangeMillis) : undefined,
})

const searchScheduledContacts_cli = async () => {
    const orbitalHelper = await makeOrbitalHelper()

    let ii = 1
    const approximateIsoStr = getOptionalEnvVar(
        'SEARCH_APPROXIMATE_START_ISO_TIME'
    )
    let { noEarlierThan, noLaterThan } = plusOrMinus(
        approximateIsoStr ? new Date(approximateIsoStr) : undefined
    )
    const noEarlierThanIsoStr = approximateIsoStr
        ? undefined
        : getOptionalEnvVar('SEARCH_NO_EARLIER_THAN_ISO_TIME')
    if (!noEarlierThan && noEarlierThanIsoStr) {
        noEarlierThan = new Date(noEarlierThanIsoStr)
    }
    const noLaterThanIsoStr = approximateIsoStr
        ? undefined
        : getOptionalEnvVar('SEARCH_NO_LATER_THAN_ISO_TIME')
    if (!noLaterThan && noLaterThanIsoStr) {
        noLaterThan = new Date(
            noLaterThanIsoStr || Date.now() - 10 * 3_600 * 1000
        )
    }
    const isSuccessStr = getOptionalEnvVar('SEARCH_IS_SUCCESS')
    const searchParams: SearchScheduledContactsParams = {
        spacecraftName: getEnvVar('SEARCH_SPACECRAFT_NAME'),
        groundStationName: getEnvVar('GROUND_STATION_NAME'),
        contactProfileName: getOptionalEnvVar('SEARCH_CONTACT_PROFILE_NAME'),
        noEarlierThan,
        noLaterThan,
        isSuccess: isSuccessStr ? isSuccessStr === 'true' : undefined,
    }
    console.log(
        'Searching for scheduled contacts for:',
        JSON.stringify(searchParams, null, 2)
    )
    const searchResults = orbitalHelper.searchScheduledContacts(searchParams)
    for await (const searchResultItem of searchResults) {
        console.log(
            `${ii++}:`,
            JSON.stringify(searchResultItem.summary, null, 2)
        )
    }
}

/* -------------------------------------------------------------------+
| List scheduled contacts.
| ℹ️ Current expected usage is listing all scheduled contacts.
|    Recommend `searchScheduledContacts` to enable filtering by:
|      • start time no earlier than.
|      • start time no later than.
|      • success/failure.
|      • ground station name.
|      • contact profile name.
|
| ℹ️ Orbital Portal view for scheduled contacts displays columns
|    that are not helpful: type, resource group, location, subscription.
|    Recommend: contact profile name, ground station name, status
+------------------------------------------------------------------------*/

if (require.main === module) {
    searchScheduledContacts_cli().catch((err) => console.error(err.message))
}
