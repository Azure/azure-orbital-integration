import * as chai from 'chai'
const expect = chai.expect
const asset = chai.assert
import {Socket} from "net"
import { getEnv, getEnvVar, makeRemoteToken, sleep} from "../src/utils"


// TODO
// How to properly make a remoteConnection?
// does sleep sleep within and send an undefined promise back? 
// Help setup debugging.

describe('utils.getEnv', () => {
    beforeEach(() => {
        process.env.CONTACT_DATA_STORAGE_CONTAINER = "connection-string"
        process.env.CONTACT_DATA_STORAGE_CONNECTION_STRING = "connectionString"
        process.env.HOST = "localhost"
        process.env.PORT = "8080"
        process.env.SOCKET_TIMEOUT_SECONDS = "60"
    }),
    afterEach(() => {
        delete process.env.CONTACT_DATA_STORAGE_CONTAINER
        delete process.env.CONTAINER_DATA_STORAGE_CONNECTION_STRING
        delete process.env.HOST
        delete process.env.PORT
        delete process.env.SOCKET_TIMEOUT_SECONDS
    })
    it('should return the correct object and properties within', () => {
        
        const result = getEnv()
        expect(result.storageContainer).to.be.string
        expect(result.connectionString).to.be.string
        expect(result.host).to.be.string
        expect(result.port).to.be.string 
        expect(result.socketTimeoutSeconds).to.be.string
        expect(result.port).to.equal(8080)
        expect(result.socketTimeoutSeconds).to.equal(60)
    })
    it('should throw an error because storageContainer is not defined', () => {
        delete process.env.CONTACT_DATA_STORAGE_CONTAINER
        const testGetEnv = () => {getEnv()}
        expect(testGetEnv).to.throw(Error)
    })
    it('should throw an error because host is not defined', () => {
        delete process.env.HOST
        const testGetEnv = () => {getEnv()}
        expect(testGetEnv).to.throw()        
    })
    it('should throw an error because port is not defined', () => {
        delete process.env.PORT
        const testGetEnv = () => {getEnv()}
        expect(testGetEnv).to.throw(Error)      
    })
});

describe('utils.getEnvVar', () => {
    it('should return a value for PATH', () => {
        const result = getEnvVar('PATH')
        expect(result).to.be.string
    })
    it('should throw an error becuase THIS_ENV_VAR does not exist', () => {
        const testGetEnvVar = function () { getEnvVar('THIS_ENV_VAR')}
        expect(testGetEnvVar).to.throw()
    })
});

// describe('utils.makeRemoteToken', () => {
//     it('should return null if no values are passed', () => {
        
//         let rc = new Socket({
//             socket: 'localhost',
//             port: 8080,
//         })
//         console.log("SOCKET", rc.remoteAddress, rc.remotePort)
//         const result = makeRemoteToken(rc)
//         console.log(result)
//         expect(result).to.be.null
//     })
// })

// describe('utils.sleep', async () => {
//     it('should return a promise of setTimeout', async () => {
//         const result = await sleep(1_500)
//         console.log("RESULT", result, typeof(result)) 
//         expect(result).to.be.a('promise')
//     })
// })