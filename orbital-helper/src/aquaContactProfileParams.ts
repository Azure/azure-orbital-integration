// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { ContactProfilesCreateOrUpdateOptionalParams } from '@azure/arm-orbital'

export interface MakeAquaContactProfileParams {
    name: string
    endpointName: string
    endpointIP: string
    endpointPort: number
    subnetId: string
    demodConfig?: string
}

export const makeAquaContactProfileParams = (
    params: MakeAquaContactProfileParams
): ContactProfilesCreateOrUpdateOptionalParams => {
    return {
        // Must be empty subnet delegated to Azure Orbital
        networkConfiguration: {
            subnetId: params.subnetId,
        },
        minimumViableContactDuration: 'PT1M',
        minimumElevationDegrees: 5,
        autoTrackingConfiguration: 'disabled',
        links: [
            {
                name: `${params.endpointName}-link`,
                polarization: 'RHCP',
                direction: 'Downlink',
                gainOverTemperature: 0,
                eirpdBW: 0,
                channels: [
                    {
                        name: `${params.endpointName}-chanel`,
                        centerFrequencyMHz: 8160,
                        bandwidthMHz: 15,
                        endPoint: {
                            ipAddress: params.endpointIP,
                            endPointName: params.endpointName,
                            port: params.endpointPort.toString(),
                            protocol: 'TCP',
                        },
                        modulationConfiguration: undefined,
                        demodulationConfiguration:
                            params.demodConfig ?? undefined,
                        encodingConfiguration: undefined,
                        decodingConfiguration: undefined,
                    },
                ],
            },
        ],
    }
}
