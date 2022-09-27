// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

import { BrowserWindow, app, App } from 'electron'
import { join } from 'path'
import { registerIpcMain } from './preload'

app.whenReady().then(() => {
    registerIpcMain()
})

class OrbitalHelperUI {
    private mainWindow: BrowserWindow | null = null
    private app: App
    private mainURL: string = `file://${__dirname}/index.html`

    constructor(app: App) {
        this.app = app
        this.app.on('window-all-closed', this.onWindowAllClosed.bind(this))
        this.app.on('ready', this.create.bind(this))
        this.app.on('activate', this.onActivated.bind(this))
    }

    private onWindowAllClosed() {
        this.app.quit()
    }

    private create() {
        this.mainWindow = new BrowserWindow({
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: true,
                nodeIntegrationInWorker: true,
                preload: join(__dirname, 'preload.js'),
            },
            width: 1600,
            height: 800,
            minWidth: 500,
            minHeight: 250,
            acceptFirstMouse: true,
            titleBarStyle: 'default',
        })

        this.mainWindow.loadURL(this.mainURL)
        // this.mainWindow.webContents.openDevTools()

        this.mainWindow.on('closed', () => {
            this.mainWindow = null
        })
    }

    private onReady() {
        this.create()
    }

    private onActivated() {
        if (this.mainWindow === null) {
            this.create()
        }
    }
}

new OrbitalHelperUI(app)
