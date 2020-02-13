import { app, BrowserWindow, Tray, ipcMain, Menu, MenuItemConstructorOptions, systemPreferences, nativeTheme, screen } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as log from 'electron-log'
import * as path from 'path'
import * as url from 'url'

import { reportUnhandledRejections } from '../share/reportUnhandledRejections'

let tray: Tray | null
let win: BrowserWindow | null

const WINDOW_WIDTH = 380
const WINDOW_HEIGHT = 460

const installExtensions = async () => {
    const installer = require('electron-devtools-installer')
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS
    const extensions = ['REACT_DEVELOPER_TOOLS']

    return Promise.all(extensions.map(name => installer.default(installer[name], forceDownload))).catch(console.log)
}

const getTrayImage = () => {
    const icon = nativeTheme.shouldUseDarkColors ? 'icon-dark-mode.png' : 'icon.png'

    return path.join(__dirname, 'assets', icon)
}

const createTray = () => {
    tray = new Tray(getTrayImage())

    tray.setToolTip('Merge Request Notifier')
    tray.on('click', toggleWindow)
}

const toggleWindow = () => {
    win && win.isVisible() ? hideWindow() : showWindow()
}

const getWindowPosition = () => {
    if (!win || !tray) {
        return undefined
    }

    const windowBounds = win.getBounds()
    const trayBounds = tray.getBounds()

    const screenwidth = screen.getPrimaryDisplay().workAreaSize.width
    const screenheight = screen.getPrimaryDisplay().workAreaSize.height

    let startx = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
    let starty = Math.round(trayBounds.y + trayBounds.height + 4)

    if (startx < 0) {
        startx = 0
    }

    if (starty < 0) {
        starty = 0
    }

    if (startx + WINDOW_WIDTH > screenwidth) {
        startx = screenwidth - WINDOW_WIDTH
    }

    if (starty + WINDOW_HEIGHT > screenheight) {
        starty = screenheight - WINDOW_HEIGHT
    }

    const x = startx
    const y = starty
    return { x, y }

    return { x, y }
}

const setup = async () => {
    reportUnhandledRejections()
    log.debug('Starting the app')

    try {
        autoUpdater.autoDownload = false

        if (process.env.NODE_ENV !== 'production') {
            // __dirname is the "dist" folder
            autoUpdater.updateConfigPath = path.join(__dirname, '../dev-app-update.yml')
            await installExtensions()
        }

        createTray()
        createWindow()
        createMenu()
        registerForNotifications()
        // Register for getting notifications
        app.setAppUserModelId(process.execPath)

        log.debug('App started')
    } catch (error) {
        log.error(`Could not start the app: ${JSON.stringify(error)}`)
    }
}

const hideWindow = () => {
    if (win && win.isVisible()) {
        win.hide()
        if (app.dock) {
            app.dock.hide()
        }
    }
}

const showWindow = () => {
    const position = getWindowPosition()

    if (position && win) {
        if (app.dock) {
            app.dock.show()
        }

        // We have to wait a bit because the dock.show() is triggering a "window.hide" event
        // otherwise the app would be closed immediately
        setTimeout(() => {
            win!.setPosition(position.x, position.y, false)
            win!.show()
        }, 200)
    }
}

const createMenu = () => {
    const devMenuTemplate: MenuItemConstructorOptions[] =
        process.env.NODE_ENV === 'production'
            ? []
            : [
                  { type: 'separator' },
                  {
                      label: 'Toggle DevTools',
                      click: () => {
                          if (win) {
                              if (win.webContents.isDevToolsOpened()) {
                                  win.webContents.closeDevTools()
                                  win.setSize(WINDOW_WIDTH, WINDOW_HEIGHT)
                              } else {
                                  win.webContents.openDevTools()
                                  win.setSize(WINDOW_WIDTH * 3, WINDOW_HEIGHT * 2)
                              }
                          }
                      },
                  },
                  {
                      label: 'Toggle Test Data',
                      click: () => {
                          toggleQueryParam('test-data')
                      },
                  },
                  {
                      label: 'Toggle Fake update',
                      click: () => {
                          toggleQueryParam('fake-update')
                      },
                  },
              ]

    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: 'Application',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: () => {
                        app.quit()
                    },
                },
                ...devMenuTemplate,
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
            ],
        },
    ]

    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
}

const toggleQueryParam = (parameter: string) => {
    if (win) {
        const currentUrl = new URL(win.webContents.getURL())

        if (currentUrl.searchParams.has(parameter)) {
            currentUrl.searchParams.delete(parameter)
        } else {
            currentUrl.searchParams.set(parameter, '1')
        }

        win.loadURL(currentUrl.href)
    }
}

const createWindow = () => {
    win = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        show: false,
        frame: false,
        fullscreenable: false,
        resizable: false,
        transparent: false,
        webPreferences: {
            backgroundThrottling: false,
            nodeIntegration: true,
        },
    })

    if (process.env.NODE_ENV !== 'production') {
        process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'
        win.loadURL(`http://localhost:2003`)
    } else {
        win.loadURL(
            url.format({
                pathname: path.join(__dirname, 'index.html'),
                protocol: 'file:',
                slashes: true,
            }),
        )
    }

    win.on('closed', () => {
        win = null
    })

    win.on('blur', () => {
        hideWindow()
    })
}

const registerForNotifications = () => {
    const os = require('os')

    // This is specific for MACOS
    if (os.platform === 'darwin') {
        systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
            if (tray) {
                tray.setImage(getTrayImage())
            }
        })
    }
}

if (app.dock) {
    app.dock.hide()
}

app.on('ready', () => {
    setup().then(() => {
        log.debug('Setup completed')
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', async () => {
    if (win === null) {
        await createWindow()
    }
})

ipcMain.on('update-open-merge-requests', (_: any, openMergeRequests: number) => {
    if (tray) {
        if (openMergeRequests === 0) {
            tray.setTitle('')
        } else {
            tray.setTitle(String(openMergeRequests))
        }
    }
})

ipcMain.on('download-and-install-update', () => {
    autoUpdater.once('update-downloaded', () => {
        autoUpdater.quitAndInstall()
    })

    autoUpdater.downloadUpdate()
})

ipcMain.handle('check-for-updates', async () => {
    return autoUpdater.checkForUpdates().catch(error => log.error('error while checking for updates', error))
})

ipcMain.on('close-application', () => {
    app.quit()
})
