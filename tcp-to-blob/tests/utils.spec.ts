// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import * as chai from 'chai'
const expect = chai.expect
const assert = chai.assert
import { getEnv, getEnvVar } from '../src/utils'

describe('utils.getEnv', () => {
    beforeEach(() => {
        process.env.CONTACT_DATA_STORAGE_CONTAINER = 'your-container'
        process.env.HOST = 'localhost'
        process.env.PORT = '8080'
        process.env.SOCKET_TIMEOUT_SECONDS = '60'
    })
    afterEach(() => {
        delete process.env.CONTACT_DATA_STORAGE_CONTAINER
        delete process.env.HOST
        delete process.env.PORT
        delete process.env.SOCKET_TIMEOUT_SECONDS
    })
    it('should return the correct object and properties within', () => {
        const result = getEnv()
        assert.isString(result.storageContainer, 'storageContainer')
        assert.isString(result.host, 'host')
        assert.isNumber(result.port, 'port')
        assert.isNumber(result.socketTimeoutSeconds, 'socketTimeoutSeconds')
        expect(result.port).to.equal(8080, 'port')
        expect(result.socketTimeoutSeconds).to.equal(60, 'socketTimeoutSeconds')
    })
    it('should throw an error because storageContainer is not defined', () => {
        delete process.env.CONTACT_DATA_STORAGE_CONTAINER
        const testGetEnv = () => {
            getEnv()
        }
        expect(testGetEnv).to.throw(Error)
    })
    it('should throw an error because host is not defined', () => {
        delete process.env.HOST
        const testGetEnv = () => {
            getEnv()
        }
        expect(testGetEnv).to.throw()
    })
    it('should throw an error because port is not defined', () => {
        delete process.env.PORT
        const testGetEnv = () => {
            getEnv()
        }
        expect(testGetEnv).to.throw(Error)
    })
})

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
