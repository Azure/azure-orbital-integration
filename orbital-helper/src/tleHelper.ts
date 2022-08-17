// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { get } from 'http'
import {getEnvVar} from './utils';

export interface TLE {
    title: string
    line1: string
    line2: string
}
export const getTLE = (title: string): Promise<TLE> => {

    return new Promise((resolve, reject) => {

        let data = ''
        const options = {
            hostname: process.env.TLE_PROVIDER_HOSTNAME ?? 'celestrak.org',
            port: 80,
            path: process.env.TLE_PROVIDER_PATH ?? '/NORAD/elements/active.txt',
            method: 'GET',

        };

        const req = get(options, res => {
            res.on('data', d => {
                data = `${data}${d.toString()}`
            });
        });

        const errMessage = `No TLE found for "${title}" at "${options.hostname}${options.path}"`
        req.on('close', () => {

            const lines = data.split(/\r?\n/)
            if(lines.length < 3) {
                return reject(errMessage)
            }
            for(let ii=0; ii<lines.length; ii++) {
                if(lines[ii].trim() === title.trim()){
                    return resolve({
                        title,
                        line1: lines[ii + 1],
                        line2: lines[ii + 2],
                    })
                }
            }

            return reject(errMessage)
        })

        req.on('error', (error) => {
            reject(new Error(`${errMessage}: ${(error as Error)?.message}`));
        });
    })
}

if(require.main === module) {
    const tleTitle = getEnvVar('TLE_TITLE')
    getTLE(tleTitle)
        .then(tle => {
            console.log(JSON.stringify(tle, null, 2))
        })
        .catch(error => {
            console.error(error)
        })
}