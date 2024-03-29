// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import {
    AzureOrbital,
    Contact,
    ContactProfile,
    ContactProfilesCreateOrUpdateOptionalParams,
    ContactsCreateResponse,
    Spacecraft,
    SpacecraftsCreateOrUpdateOptionalParams,
} from '@azure/arm-orbital'
import { DefaultAzureCredential } from '@azure/identity'
import {
    BaseLogParams,
    EventLogger,
    getEnvVar,
    getNumHours,
    makeLogger,
    prettyDuration,
} from '@azure/orbital-integration-common'
import { getTLE, TLE } from './tleHelper'
import {
    makeAquaContactProfileParams,
    MakeAquaContactProfileParams,
} from './aquaContactProfileParams'

export const getEndpointFromEnv = () => {
    const endpointPort = +getEnvVar('ENDPOINT_PORT')
    if (isNaN(endpointPort)) {
        throw new Error('Env variable "ENDPOINT_PORT" must be a number.')
    }

    return {
        endpointName: getEnvVar('ENDPOINT_NAME'),
        endpointIP: getEnvVar('ENDPOINT_IP'),
        endpointPort,
        subnetId: getEnvVar('ENDPOINT_SUBNET_ID'),
    }
}

export interface GetNextContactParams {
    spaceCraftName: string
    contactProfileName: string
    groundStationName: string
    minDurationMinutes?: number
    maxDurationMinutes: number
    minMinutesFromNow?: number
    maxMinutesFromNow?: number
}

interface MakeOrbitalHelperParams {
    resourceGroup: string
    location: string
    orbitalClient: AzureOrbital
    logger: EventLogger<BaseLogParams>
}

export interface ContactWithSummary {
    contact: Contact
    summary: ContactSummary
}

const makeContactSummary = (_contact: Contact): ContactSummary => {
    const contactStart =
        _contact.rxStartTime ??
        (_contact.reservationStartTime as unknown as Date)
    const contactEnd = _contact.rxEndTime ?? _contact.reservationEndTime
    let endMillis = contactEnd?.getTime()
    let startMillis = contactStart?.getTime()
    let startTimeRelative = ''
    const nowMillis = Date.now()
    if (startMillis) {
        const numHours = getNumHours(contactStart)
        if (numHours > 24) {
            startTimeRelative = contactStart.toLocaleString()
        } else if (nowMillis - startMillis > 0) {
            startTimeRelative = `${prettyDuration({
                startMillis,
                endMillis: nowMillis,
            })} (ago)`
        } else {
            startTimeRelative = `${prettyDuration({
                startMillis: nowMillis,
                endMillis,
            })} (from now)`
        }
    }
    const contactProfileId = _contact.contactProfile?.id ?? ''
    const contactProfileName = contactProfileId
        .substring(1 + contactProfileId.lastIndexOf('/'))
        .toLowerCase()

    const { provisioningState, status, errorMessage } = _contact
    return {
        contactProfileName,
        groundStationName: _contact.groundStationName?.toLowerCase() ?? '',
        duration:
            startMillis && endMillis
                ? prettyDuration({ startMillis, endMillis })
                : '',
        startTimeRelative,
        startTime: contactStart?.toLocaleString() ?? '',
        startTimeUTC: contactStart?.toISOString() ?? '',
        provisioningState: provisioningState || undefined,
        status: status || undefined,
        errorMessage: errorMessage || undefined,
    }
}

export interface ContactSummary {
    contactName?: string
    contactProfileName: string
    groundStationName: string
    duration: string
    startTimeRelative: string
    startTime?: string
    startTimeUTC?: string
    provisioningState?: string
    status?: string
    errorMessage?: string
}

export interface SearchScheduledContactsParams {
    spacecraftName: string
    contactProfileName?: string
    groundStationName?: string
    noEarlierThan?: Date
    noLaterThan?: Date
    isSuccess?: boolean
}

export interface ScheduleNextContactResponse extends ContactWithSummary {
    contactName: string
}

export interface ScheduleContactParams {
    groundStationName: string
    spaceCraftName: string
    contactProfileName: string
    reservationEndTime: Date
    reservationStartTime: Date
}

export interface OrbitalHelper {
    orbitalClient: AzureOrbital
    subscription: string
    resourceGroup: string
    location: string

    listSpacecrafts(): Promise<Spacecraft[]>

    scheduleContact(
        params: ScheduleContactParams
    ): Promise<{ contactName: string }>

    getNextContact(
        params: GetNextContactParams
    ): Promise<ContactWithSummary | void>

    scheduleNextContact(
        params: GetNextContactParams
    ): Promise<ScheduleNextContactResponse | void>

    searchScheduledContacts(
        params?: SearchScheduledContactsParams
    ): AsyncGenerator<ContactWithSummary>

    updateTLE(params: { spacecraftName: string }): Promise<TLE>

    createContactProfile(
        _params: MakeAquaContactProfileParams
    ): Promise<ContactProfile>
}

export interface ScheduleNextContactResponse extends ContactWithSummary {
    contactName: string
}

const checkContactsCreateResponse = (unhelpfulRes: ContactsCreateResponse) => {
    // Ideally if create contact failed, it would throw but...
    // At least if it didn't throw, it would populate the errorMessage defined by the schema...
    if (unhelpfulRes.errorMessage) {
        // this seems to NEVER be populated... but just in case it's fixed.
        throw new Error(unhelpfulRes.errorMessage)
    }
    // But since it does neither...
    // This isn't part of type that should be returned, but it's sometimes there ! :(
    // @ts-ignore
    if (unhelpfulRes?.error) {
        // @ts-ignore
        const { code, message } = unhelpfulRes?.error
        // @ts-ignore
        throw new Error(
            `${code ? '[' + code + '] ' : ''}${
                (unhelpfulRes as any)?.error?.message
            }`
        )
    }
}

export const getHelperEnvVars = () => {
    return {
        resourceGroup: getEnvVar('AZ_RESOURCE_GROUP'),
        location: getEnvVar('AZ_LOCATION'),
        subscription: getEnvVar('AZ_SUBSCRIPTION'),
    }
}
export const makeHelperParamsFromEnv = (): Omit<
    MakeOrbitalHelperParams,
    'logger'
> => {
    const envParams = getHelperEnvVars()
    return {
        ...envParams,
        orbitalClient: new AzureOrbital(
            new DefaultAzureCredential(),
            envParams.subscription
        ),
    }
}

export const makeOrbitalHelper = (
    {
        location,
        resourceGroup,
        orbitalClient,
        logger,
    }: MakeOrbitalHelperParams = {
        logger: makeLogger({ subsystem: 'orbital-helper' }),
        ...makeHelperParamsFromEnv(),
    }
): OrbitalHelper => {
    logger?.info({
        event: 'init',
        message: `Creating Orbital Helper for: ${JSON.stringify({
            location,
            resourceGroup,
        })}`,
    })
    const makeContactProfileShell = (profileName: string) => ({
        id: `/subscriptions/${orbitalClient.subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.Orbital/contactProfiles/${profileName}`,
    })

    const makeContactName = ({
        contactProfileName,
        startTime,
    }: {
        contactProfileName: string
        startTime: Date
    }) => `${contactProfileName}--${startTime?.toISOString()}`

    const scheduleContact = async ({
        groundStationName,
        spaceCraftName,
        contactProfileName,
        reservationStartTime,
        reservationEndTime,
    }: ScheduleContactParams) => {
        const contactName = makeContactName({
            contactProfileName,
            startTime: reservationStartTime,
        })
        const lastUnnamedParam: Contact = {
            contactProfile: makeContactProfileShell(contactProfileName),
            groundStationName,
            reservationEndTime,
            reservationStartTime,
        }
        logger.info({
            event: 'schedule-contact',
            message: `Scheduling contact`,
            params: lastUnnamedParam,
        })
        const unhelpfulRes = await orbitalClient.contacts.beginCreateAndWait(
            resourceGroup,
            spaceCraftName,
            contactName,
            lastUnnamedParam
        )
        checkContactsCreateResponse(unhelpfulRes)

        return {
            contactName,
        }
    }

    const listSpacecrafts = async () => {
        const crafts: Spacecraft[] = []
        for await (const _craft of orbitalClient.spacecrafts.list(
            resourceGroup
        )) {
            crafts.push(_craft)
        }
        return crafts
    }

    const getNextContact = async ({
        minDurationMinutes = 0,
        maxDurationMinutes,
        minMinutesFromNow = 0,
        maxMinutesFromNow,
        ..._parms
    }: GetNextContactParams): Promise<ContactWithSummary | void> => {
        const startTime = minMinutesFromNow
            ? new Date(Date.now() + MILLIS_PER_MINUTE * minMinutesFromNow)
            : new Date()
        const contacts =
            await orbitalClient.spacecrafts.beginListAvailableContactsAndWait(
                resourceGroup,
                _parms.spaceCraftName,
                makeContactProfileShell(_parms.contactProfileName),
                _parms.groundStationName,
                startTime,
                new Date(startTime.getTime() + 48 * 3600 * 1_000)
            )

        const minDurMills = minDurationMinutes
            ? minDurationMinutes * MILLIS_PER_MINUTE
            : 0
        const maxDurMillis = maxDurationMinutes * MILLIS_PER_MINUTE
        const minMillisFromNow = minMinutesFromNow * MILLIS_PER_MINUTE
        const maxMillisFromNow = maxMinutesFromNow
            ? maxMinutesFromNow * MILLIS_PER_MINUTE
            : Number.MAX_SAFE_INTEGER
        for await (const _contact of contacts) {
            if (!_contact?.rxStartTime || !_contact?.rxEndTime) {
                continue
            }
            const endMillis = new Date(_contact.rxEndTime).getTime()
            const startMillis = new Date(_contact.rxStartTime).getTime()
            const durationMillis = endMillis - startMillis
            if (
                durationMillis < maxDurMillis &&
                durationMillis > minDurMills &&
                startMillis < maxMillisFromNow &&
                startMillis > minMillisFromNow
            ) {
                return {
                    contact: _contact,
                    summary: {
                        ...makeContactSummary(_contact),
                        contactProfileName: _parms.contactProfileName,
                    },
                }
            }
        }
        return
    }

    const scheduleNextContact = async (
        schedParams: GetNextContactParams
    ): Promise<ScheduleNextContactResponse | void> => {
        logger.info({
            event: 'schedule-next-contact',
            message: `Finding next contact`,
            params: schedParams,
        })
        const nextContact = await getNextContact(schedParams)

        if (!nextContact) {
            return
        }

        const { contact, summary } = nextContact
        if (!contact.rxStartTime) {
            throw new Error('Contact should have a "rxStartTime!') // I think this is just lazy typing... should never be null
        }
        const contactName = makeContactName({
            contactProfileName: schedParams.contactProfileName,
            startTime: contact?.rxStartTime,
        })
        const lastUnnamedParam: Contact = {
            contactProfile: makeContactProfileShell(
                schedParams.contactProfileName
            ),
            groundStationName: schedParams.groundStationName,
            reservationEndTime: contact.rxEndTime,
            reservationStartTime: contact.rxStartTime,
        }
        logger.info({
            event: 'schedule-next-contact',
            message: `Scheduling contact`,
            params: lastUnnamedParam,
        })
        const unhelpfulRes = await orbitalClient.contacts.beginCreateAndWait(
            resourceGroup,
            schedParams.spaceCraftName,
            contactName,
            lastUnnamedParam
        )

        checkContactsCreateResponse(unhelpfulRes)

        return {
            contactName,
            contact,
            summary,
        }
    }

    const searchScheduledContacts = async function* _getScheduledContacts(
        _params: SearchScheduledContactsParams
    ): AsyncGenerator<ContactWithSummary> {
        logger.info({
            event: 'search-scheduled-contacts',
            message: 'Searching scheduled contacts.',
            params: _params,
        })
        const contacts = await orbitalClient.contacts.list(
            resourceGroup,
            _params.spacecraftName
        )
        for await (const _contact of contacts) {
            if (
                _params.contactProfileName &&
                !_contact.contactProfile?.id
                    ?.toLowerCase()
                    .endsWith(_params.contactProfileName.toLowerCase())
            ) {
                continue
            }
            if (
                _params.groundStationName &&
                _contact.groundStationName?.toLowerCase() !==
                    _params.groundStationName?.toLowerCase()
            ) {
                continue
            }
            const start = _contact.rxStartTime ?? _contact.reservationStartTime
            if (start) {
                if (
                    _params.noEarlierThan &&
                    _params.noEarlierThan?.getTime() - start.getTime() > 0
                ) {
                    continue
                }
                if (
                    _params.noLaterThan &&
                    _params.noLaterThan?.getTime() - start.getTime() < 0
                ) {
                    continue
                }
                if (_params.isSuccess !== undefined) {
                    if (_params.isSuccess && _contact.status !== 'succeeded') {
                        continue
                    }
                    if (!_params.isSuccess && _contact.status === 'succeeded') {
                        continue
                    }
                }
            }
            yield {
                contact: _contact,
                summary: {
                    contactName: _contact.name,
                    ...makeContactSummary(_contact),
                },
            }
        }
    }

    // Title line must match value here: http://celestrak.com/NORAD/elements/active.txt
    const updateTLE = async ({
        spacecraftName,
    }: {
        spacecraftName: string
    }) => {
        const newTLE: TLE = await getTLE(spacecraftName)
        const { location, links, titleLine, noradId } =
            await orbitalClient.spacecrafts.get(resourceGroup, spacecraftName)
        const optionalParams: SpacecraftsCreateOrUpdateOptionalParams = {
            noradId, // Required even though interface indicates optional. Ideally this would not be required for update.
            links, // Required even though interface indicates optional. Ideally this would not be required for update.
            titleLine,
            tleLine1: newTLE.line1,
            tleLine2: newTLE.line2,
        }
        logger.info({
            event: 'update-tle',
            message: `Updating TLE`,
            params: optionalParams,
        })

        await orbitalClient.spacecrafts.beginCreateOrUpdateAndWait(
            resourceGroup,
            spacecraftName,
            location,
            optionalParams
        )
        return newTLE
    }

    const createContactProfile = async (
        _params: MakeAquaContactProfileParams
    ): Promise<ContactProfile> => {
        const opts: ContactProfilesCreateOrUpdateOptionalParams =
            makeAquaContactProfileParams(_params)

        const profile =
            await orbitalClient.contactProfiles.beginCreateOrUpdateAndWait(
                resourceGroup,
                _params.name,
                location,
                opts
            )

        return profile
    }

    return {
        orbitalClient,
        subscription: orbitalClient.subscriptionId,
        resourceGroup,
        location,
        listSpacecrafts,
        scheduleContact,
        getNextContact,
        scheduleNextContact,

        searchScheduledContacts,

        updateTLE,

        createContactProfile,
    }
}

export const MILLIS_PER_MINUTE = 60_000
export const millisInDay = 24 * 60 * MILLIS_PER_MINUTE

/*----------------------------------------------------------------+
| Overall feedback
| ✅ SDK uses modern promises and async generators.
|
| ❓ What are tx/rx start and end time vs reservation start/end?
|    • For scheduled rx & reservation populated, tx always blank.
|    • For available rx & tx are populated, reservation is undefined.
|
| ⚠️ Param/return types are re-used extensively
|    in an ill-fitting way (everything optional).
|    1) Outputs that should always be populated
|       must be checked before being used.
|    2) Required params appear to be  optional resulting in
|       run-time errors instead of compile-time errors.
|
| ℹ️ Consider use of `*AvailableContacts` and `*ScheduledContacts`.
|    These are separate concepts and `contacts.list` is ambiguous.
|
| ℹ️ All constructors and most functions use ordered arguments
|    vs a single parameter (named properties).
|    e.g. searchPeople('bob', 'smith', 'james', 'hispanic', 1998)
|         vs
|         searchPeople({
|             firstName: 'bob',
|             lastName: 'smith',
|             middleName: 'james',
|             yearOfBirth: 1998
|         })
|    This is an anti-pattern that reflects fork-lifted C#/Java.
+------------------------------------------------------------------*/
