const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const { authenticate } = require('./auth');
const { listEvents, createEvent, updateEvent, deleteEvent } = require('./calendar');

const store = new Store();
let tray = null;
let mainWindow = null;
let authClient = null;

async function createWindow() {
    const { width, height, x, y } = store.get('windowBounds') || { width: 350, height: 450, x: undefined, y: undefined };

    const alwaysOnTop = store.get('alwaysOnTop', false);
    const desktopMode = store.get('desktopMode', false);
    const lockPosition = store.get('lockPosition', false);

    mainWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: alwaysOnTop,
        type: desktopMode ? 'desktop' : undefined,
        skipTaskbar: true,
        movable: !lockPosition,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (desktopMode) {
        mainWindow.setAlwaysOnTop(false);
    } else if (alwaysOnTop) {
        mainWindow.setAlwaysOnTop(true, 'floating');
    }

    // Move listener BEFORE loadFile to ensure we don't miss the event
    mainWindow.once('ready-to-show', () => { showInitialWindow(); });

    // Fallback: Force show after 3s if not visible
    setTimeout(() => { if (mainWindow && !mainWindow.isVisible()) showInitialWindow(); }, 3000);

    mainWindow.loadFile(path.join(__dirname, 'widget.html'));

    function showInitialWindow() {
        if (!mainWindow) return;
        
        const desktopMode = store.get('desktopMode', false);
        if (desktopMode) {
            mainWindow.showInactive();
        } else {
            mainWindow.show();
            mainWindow.focus(); // Ensure it comes to front
        }
    }

    mainWindow.on('resize', saveBounds);
    mainWindow.on('move', saveBounds);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function saveBounds() {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
}

function createTray() {
    if (tray) tray.destroy();
    const iconPath = path.join(__dirname, 'tray_icon.png');
    tray = new Tray(iconPath);

    const openAtLogin = store.get('openAtLogin', false);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show/Hide', click: () => toggleWindow() },
        { label: 'Sync Now', click: () => mainWindow.webContents.send('sync-now') },
        { type: 'separator' },
        { 
            label: 'Launch at Windows startup', 
            type: 'checkbox', 
            checked: openAtLogin,
            click: (menuItem) => {
                const newValue = menuItem.checked;
                updateLoginSettings(newValue);
            }
        },
        { label: 'Check for Updates', click: () => autoUpdater.checkForUpdatesAndNotify() },
        { type: 'separator' },
        { label: 'Open DevTools', click: () => mainWindow.webContents.openDevTools() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
    ]);


    tray.setToolTip('Calendar-On-Demand');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        toggleWindow();
    });
}

function toggleWindow() {
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        const settings = store.get('desktopMode', false);
        if (settings) {
            mainWindow.showInactive();
        } else {
            mainWindow.show();
        }
    }
}

app.whenReady().then(async () => {
    console.log('App is ready, authenticating...');
    try {
        authClient = await authenticate();
        console.log('Authentication successful!');
        
        createWindow();
        console.log('Window created.');
        
        createTray();
        console.log('Tray created.');

        setupAutoUpdater();
        console.log('Auto-updater initialized.');

        // Handle global shortcut separately
        globalShortcut.register('CommandOrControl+Shift+Space', () => {
            console.log('Global shortcut triggered.');
            if (mainWindow) {
                const desktopMode = store.get('desktopMode', false);
                if (desktopMode) {
                    mainWindow.showInactive();
                } else {
                    mainWindow.show();
                }
                mainWindow.webContents.send('open-quick-add');
            }
        });
        
        if (process.argv.includes('--hidden')) {
            console.log('App started in hidden mode (tray only).');
        }
    } catch (error) {
        console.error('Failed in main process:', error);
        app.quit();
    }
});


app.on('window-all-closed', () => {
    // For a tray-based app, we don't want to quit even if all windows are closed.
    // The app should stay alive in the system tray.
});


// IPC Handlers
ipcMain.handle('get-events', async (event, { timeMin, timeMax }) => {
    // Utility for timeout
    const withTimeout = (promise, ms) => {
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out')), ms);
        });
        return Promise.race([promise, timeout]);
    };

    try {
        if (!authClient) {
            console.log('No auth client, attempting to re-authenticate...');
            authClient = await authenticate();
        }

        const { google } = require('googleapis');
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        
        // Fetch calendar list to get colors with 10s timeout
        console.log('Fetching calendar list...');
        const calList = await withTimeout(calendar.calendarList.list(), 10000);
        
        const colorMap = {};
        if (calList.data.items) {
            calList.data.items.forEach(item => {
                colorMap[item.id] = {
                    backgroundColor: item.backgroundColor,
                    foregroundColor: item.foregroundColor,
                    summary: item.summary
                };
            });
        }

        console.log('Fetching events...');
        const res = await withTimeout(calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        }), 10000);

        // Enrich events with calendar info (color)
        return res.data.items.map(e => ({
            ...e,
            calendarId: 'primary',
            backgroundColor: colorMap['primary']?.backgroundColor || '#4f8ef7',
            calendarName: colorMap['primary']?.summary || 'Primary'
        }));
    } catch (err) {
        console.error('API Error in get-events:', err.message);
        
        const isAuthError = err.code === 401 || 
                           err.code === 400 || 
                           err.message.toLowerCase().includes('auth') || 
                           err.message.toLowerCase().includes('token') ||
                           err.message.toLowerCase().includes('expired') ||
                           err.message.toLowerCase().includes('revoked') ||
                           err.message.toLowerCase().includes('invalid_grant');

        if (isAuthError) {
            console.log('Detected auth error, triggering singleton re-authentication flow...');
            // authenticate() is now a singleton, so multiple calls won't spawn multiple windows
            authenticate(true).then(newClient => {
                authClient = newClient;
                console.log('Re-authentication successful.');
                if (mainWindow) mainWindow.webContents.send('sync-now');
            }).catch(e => {
                console.error('Re-authentication failed:', e.message);
            });
        }
        throw err; // Re-throw so the renderer catch block shows "Sync Failed"
    }
});

ipcMain.handle('reset-auth', async () => {
    console.log('Manual auth reset requested from UI...');
    try {
        authClient = await authenticate(true);
        console.log('Manual re-authentication successful.');
        if (mainWindow) mainWindow.webContents.send('sync-now');
        return { success: true };
    } catch (err) {
        console.error('Manual re-authentication failed:', err.message);
        throw err;
    }
});

ipcMain.handle('create-event', async (event, eventData) => {
    return await createEvent(authClient, eventData);
});

ipcMain.handle('update-event', async (event, { calendarId, eventId, eventData }) => {
    return await updateEvent(authClient, calendarId, eventId, eventData);
});

ipcMain.handle('delete-event', async (event, { calendarId, eventId }) => {
    return await deleteEvent(authClient, calendarId, eventId);
});

ipcMain.on('set-always-on-top', (event, value) => {
    if (mainWindow) {
        if (value) {
            mainWindow.setAlwaysOnTop(true, 'floating'); // Use floating for standard always on top
            store.set('desktopMode', false); // Disable desktop mode if always on top is enabled
        } else {
            mainWindow.setAlwaysOnTop(false);
        }
        store.set('alwaysOnTop', value);
    }
});

ipcMain.on('set-lock-position', (event, value) => {
    if (mainWindow) {
        mainWindow.setMovable(!value);
        store.set('lockPosition', value);
    }
});

ipcMain.on('set-desktop-mode', (event, value) => {
    if (mainWindow) {
        if (value) {
            // For Desktop Mode on Windows, we actually want it NOT to be Always on Top.
            // This allows other normal windows to cover it.
            mainWindow.setAlwaysOnTop(false);
            store.set('alwaysOnTop', false);
        }
        store.set('desktopMode', value);
    }
});

ipcMain.on('set-theme-prop', (event, { key, value }) => {
    store.set(key, value);
});

ipcMain.handle('get-settings', () => {
    return {
        alwaysOnTop: store.get('alwaysOnTop', false),
        lockPosition: store.get('lockPosition', false),
        desktopMode: store.get('desktopMode', false),
        openAtLogin: store.get('openAtLogin', false),
        'bg-base': store.get('bg-base', '#0f0f14'),
        'text-color': store.get('text-color', '#e8e8e8'),
        'accent-color': store.get('accent-color', '#4f8ef7'),
        'bg-opacity': store.get('bg-opacity', 0.92),
        startOfWeek: store.get('startOfWeek', 0)
    };
});

ipcMain.on('set-start-of-week', (event, value) => {
    store.set('startOfWeek', value);
});

ipcMain.handle('get-login-settings', () => {
    const osSettings = app.getLoginItemSettings();
    const storedValue = store.get('openAtLogin', false);
    return {
        openAtLogin: osSettings.openAtLogin || storedValue
    };
});

function updateLoginSettings(value) {
    store.set('openAtLogin', value);
    
    const isDev = !app.isPackaged;
    const loginSettings = {
        openAtLogin: value,
        path: app.getPath('exe'),
        args: []
    };
    app.setLoginItemSettings(loginSettings);
    
    if (tray) createTray();
}

ipcMain.on('set-login-settings', (event, settings) => {
    updateLoginSettings(settings.openAtLogin);
});

function setupAutoUpdater() {
    autoUpdater.on('update-available', () => {
        new Notification({
            title: 'Calendar-On-Demand',
            body: 'A new update is available. Downloading now...'
        }).show();
    });

    autoUpdater.on('update-downloaded', () => {
        new Notification({
            title: 'Calendar-On-Demand',
            body: 'Update downloaded. It will be installed on next launch.'
        }).show();
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err);
    });
}
