// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { BaseLogParams, EventLogger, makeLogger } from '../src/logger'
import { mock, SinonMock } from 'sinon'

describe('logger.makeLogger', () => {
    let mockConsole: SinonMock
    let logger: EventLogger<BaseLogParams>
    beforeEach(() => {
        mockConsole = mock(console)
        logger = makeLogger({
            subsystem: 'test/logger',
        })
    })
    afterEach(() => {
        mockConsole.verify()
        mockConsole.restore()
    })

    it('"info"', () => {
        mockConsole
            .expects('info')
            .once()
            .withArgs(
                JSON.stringify({
                    subsystem: 'test/logger',
                    event: 'init',
                    message: 'I initialized!',
                })
            )

        logger.info({
            event: 'init',
            message: 'I initialized!',
        })
    })

    it('"warn"', () => {
        mockConsole
            .expects('warn')
            .once()
            .withArgs(
                JSON.stringify({
                    subsystem: 'test/logger',
                    event: 'close',
                    message: 'I closed!',
                    millis: 20,
                })
            )

        logger.warn({
            event: 'close',
            message: 'I closed!',
            millis: 20,
        })
    })

    it('"error"', () => {
        const error = new Error('Oh no!')
        mockConsole
            .expects('error')
            .once()
            .withArgs(
                JSON.stringify({
                    subsystem: 'test/logger',
                    event: 'err',
                    message: 'I errored!',
                    error: error.message,
                })
            )

        logger.error({
            subsystem: 'test/logger',
            event: 'err',
            message: 'I errored!',
            error,
        })
    })

    it('"extendContext"', () => {
        mockConsole
            .expects('info')
            .once()
            .withArgs(
                JSON.stringify({
                    subsystem: 'test/logger',
                    color: 'green',
                    lengthInFeet: 12,
                    u: 2,
                    event: 'close',
                    message: 'I closed!',
                    millis: 20,
                })
            )

        logger.extendContext({
            color: 'green',
            lengthInFeet: 12,
            u: 2,
        })

        logger.info({
            event: 'close',
            message: 'I closed!',
            millis: 20,
        })
    })
})
