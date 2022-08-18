import * as chai from 'chai'
const expect = chai.expect
const asset = chai.assert
import { getEnv, getEnvVar} from "../src/utils"


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
    beforeEach(() => {
        process.env.CONTACT_DATA_STORAGE_CONTAINER = "connection-string"
    }),
    afterEach(() => {
        delete process.env.CONTACT_DATA_STORAGE_CONTAINER
    }),
    it('should return a value for CONTACT_DATA_STORAGE_CONTAINER', () => {
        const result = getEnvVar('CONTACT_DATA_STORAGE_CONTAINER')
        expect(result).to.be.string
    })
    it('should throw an error becuase THIS_ENV_VAR does not exist', () => {
        const testGetEnvVar = function () { getEnvVar('THIS_ENV_VAR')}
        expect(testGetEnvVar).to.throw()
    })
});