import { makeOrbitalHelper } from 'arm-orbital-helper/dist/orbitalHelper'
import { getEnvVar } from './utils'
import { MakeAquaContactProfileParams } from 'arm-orbital-helper/dist/aquaContactProfileParams'

const makeContactProfile = async () => {
    const { createContactProfile } = await makeOrbitalHelper()
    const aksName = getEnvVar('AKS_NAME')
    const params: MakeAquaContactProfileParams = {
        name: `${aksName}-cp`,
        endpointIP: getEnvVar('LB_IP'),
        endpointPort: +getEnvVar('PORT'),
        endpointName: aksName,
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
    makeContactProfile()
        .then(() => {
            console.log('Done.')
        })
        .catch((error) => {
            console.error(error)
        })
}
