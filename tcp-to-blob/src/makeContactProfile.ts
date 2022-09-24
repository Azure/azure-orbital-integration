import {
    getEnvVar,
    MakeAquaContactProfileParams,
    makeOrbitalHelper,
} from '@azure/arm-orbital-helper'

const makeContactProfile = async () => {
    const { createContactProfile } = await makeOrbitalHelper()
    const aksName = getEnvVar('AKS_NAME')
    const demodConfig = getEnvVar('DEMODULATION_CONFIG')
    const params: MakeAquaContactProfileParams = {
        name: `${aksName}-cp`,
        endpointIP: getEnvVar('LB_IP'),
        endpointPort: +getEnvVar('PORT'),
        endpointName: aksName,
        demodConfig,
        subnetId: `${getEnvVar('AKS_VNET_ID')}/subnets/orbital-subnet`,
    }
    console.log(
        'Making contact profile. params:',
        JSON.stringify(params, null, 2)
    )
    const res = await createContactProfile(params)
    console.log('Created contact profile:', JSON.stringify(res, null, 2))
}

if (require.main === module) {
    makeContactProfile().catch((error) => {
        console.error('Failure creating contact profile:', error.message)
    })
}
