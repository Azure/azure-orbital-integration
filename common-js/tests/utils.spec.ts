// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import * as chai from 'chai'
const expect = chai.expect
const assert = chai.assert
import { getEnvVar } from '../src/utils'

describe('utils.getEnvVar', () => {
    beforeEach(() => {
        process.env.CONTACT_DATA_STORAGE_CONTAINER = 'my-container'
    })
    afterEach(() => {
        delete process.env.CONTACT_DATA_STORAGE_CONTAINER
    })
    it('should return a value for CONTACT_DATA_STORAGE_CONTAINER', () => {
        const result = getEnvVar('CONTACT_DATA_STORAGE_CONTAINER')
        assert.isString(result)
    })
    it('should throw an error because THIS_ENV_VAR does not exist', () => {
        const testGetEnvVar = function () {
            getEnvVar('THIS_ENV_VAR')
        }
        expect(testGetEnvVar).to.throw()
    })
})
