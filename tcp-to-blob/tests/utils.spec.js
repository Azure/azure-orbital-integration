"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai = __importStar(require("chai"));
const expect = chai.expect;
const asset = chai.assert;
const utils_1 = require("../src/utils");
// TODO
// How to properly make a remoteConnection?
// does sleep sleep within and send an undefined promise back? 
// Help setup debugging.
describe('utils.getEnv', () => {
    beforeEach(() => {
        process.env.CONTACT_DATA_STORAGE_CONTAINER = "connection-string";
        process.env.CONTACT_DATA_STORAGE_CONNECTION_STRING = "connectionString";
        process.env.HOST = "localhost";
        process.env.PORT = "8080";
        process.env.SOCKET_TIMEOUT_SECONDS = "60";
    }),
        afterEach(() => {
            delete process.env.CONTACT_DATA_STORAGE_CONTAINER;
            delete process.env.CONTAINER_DATA_STORAGE_CONNECTION_STRING;
            delete process.env.HOST;
            delete process.env.PORT;
            delete process.env.SOCKET_TIMEOUT_SECONDS;
        });
    it('should return the correct object and properties within', () => {
        const result = (0, utils_1.getEnv)();
        expect(result.storageContainer).to.be.string;
        expect(result.connectionString).to.be.string;
        expect(result.host).to.be.string;
        expect(result.port).to.be.string;
        expect(result.socketTimeoutSeconds).to.be.string;
        expect(result.port).to.equal(8080);
        expect(result.socketTimeoutSeconds).to.equal(60);
    });
    it('should throw an error because storageContainer is not defined', () => {
        delete process.env.CONTACT_DATA_STORAGE_CONTAINER;
        const testGetEnv = () => { (0, utils_1.getEnv)(); };
        expect(testGetEnv).to.throw(Error);
    });
    it('should throw an error because host is not defined', () => {
        delete process.env.HOST;
        const testGetEnv = () => { (0, utils_1.getEnv)(); };
        expect(testGetEnv).to.throw();
    });
    it('should throw an error because port is not defined', () => {
        delete process.env.PORT;
        const testGetEnv = () => { (0, utils_1.getEnv)(); };
        expect(testGetEnv).to.throw(Error);
    });
});
describe('utils.getEnvVar', () => {
    it('should return a value for PATH', () => {
        const result = (0, utils_1.getEnvVar)('PATH');
        expect(result).to.be.string;
    });
    it('should throw an error becuase THIS_ENV_VAR does not exist', () => {
        const testGetEnvVar = function () { (0, utils_1.getEnvVar)('THIS_ENV_VAR'); };
        expect(testGetEnvVar).to.throw();
    });
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
//# sourceMappingURL=utils.spec.js.map