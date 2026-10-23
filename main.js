const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const { authenticate, authenticateNewAccount, hasTasksScope, authenticateTasksScope } = require('./auth');
const {
    getCalendars,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getTaskLists,
    listGoogleTasks,
    createGoogleTask,
    updateGoogleTask,
    deleteGoogleTask,
    clearCompletedGoogleTasks
} = require('./calendar');

const store = new Store();
app.setAppUserModelId('com.calendar.ondemand'); // Required for Windows notifications

let tray = null;
let mainWindow = null;
let authClient = null;
let isQuitting = false;
let isStartupGracePeriod = true;
let saveBoundsTimeout = null;
let currentHotkeyToggle = null;
let currentTaskHotkeyToggle = null;
let isPoppedByHotkey = false;
let desktopDismissTimeout = null;

// ── Multi-account helpers ──────────────────────────────────────────────────

function createAuthClientForAccount(account) {
    const { google } = require('googleapis');
    const fs = require('fs');
    const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json')));
    const { client_id, client_secret } = credentials.installed;
    const client = new google.auth.OAuth2(client_id, client_secret);
    client.setCredentials(account.token);
    client.on('tokens', (newTokens) => {
        const accounts = store.get('additionalAccounts', []);
        const idx = accounts.findIndex(a => a.email === account.email);
        if (idx !== -1) {
            accounts[idx].token = { ...accounts[idx].token, ...newTokens };
            store.set('additionalAccounts', accounts);
        }
    });
    return client;
}

async function fetchAndStorePrimaryEmail() {
    const current = store.get('primaryEmail');
    if (current && current !== 'Primary Account') return current;
    try {
        if (!authClient) authClient = await authenticate();
        const cals = await getCalendars(authClient);
        const primaryCal = cals.find(c => c.primary) || cals.find(c => c.id && c.id.includes('@'));
        if (primaryCal) {
            const email = primaryCal.id.includes('@') ? primaryCal.id : (primaryCal.summary || 'Primary Account');
            store.set('primaryEmail', email);
            console.log('Primary account email stored from calendar:', email);
            return email;
        }
    } catch (e) {
        console.warn('Could not fetch primary email:', e.message);
    }
    return store.get('primaryEmail', 'Primary Account');
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            
            // Rescue if window was somehow off-screen
            const bounds = mainWindow.getBounds();
            const displays = screen.getAllDisplays();
            const isVisible = displays.some(display => {
                const b = display.bounds;
                return (
                    bounds.x + bounds.width > b.x + 50 &&
                    bounds.x < b.x + b.width - 50 &&
                    bounds.y + bounds.height > b.y + 50 &&
                    bounds.y < b.y + b.height - 50
                );
            });
            if (!isVisible) {
                mainWindow.center();
            }

            mainWindow.show();
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.focus();
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const keepTop = store.get('alwaysOnTop', false);
                    mainWindow.setAlwaysOnTop(keepTop, keepTop ? 'floating' : 'normal');
                }
            }, 1000);
        }
    });
    
    app.on('before-quit', () => {
        isQuitting = true;
        try {
            globalShortcut.unregisterAll();
        } catch (_e) {}
        if (desktopDismissTimeout) clearTimeout(desktopDismissTimeout);
        if (saveBoundsTimeout && mainWindow && !mainWindow.isDestroyed() && !store.get('lockPosition', false)) {
            clearTimeout(saveBoundsTimeout);
            const bounds = mainWindow.getBounds();
            store.set('windowBounds', {
                x: Math.round(bounds.x),
                y: Math.round(bounds.y),
                width: Math.max(370, Math.round(bounds.width)),
                height: Math.max(430, Math.round(bounds.height))
            });
        }
    });

    app.whenReady().then(async () => {
        console.log('App is ready, authenticating...');
        try {
            authClient = await authenticate();
            console.log('Authentication successful!');
            fetchAndStorePrimaryEmail().catch(e => console.warn('Email fetch skipped:', e.message));
            
            createWindow();
            console.log('Window created.');
            
            createTray();
            console.log('Tray created.');

            setupAutoUpdater();
            console.log('Auto-updater initialized.');

            // Initialize customizable global toggle hotkey
            const savedHotkey = store.get('hotkeyToggle', 'CommandOrControl+Shift+C');
            registerGlobalToggleHotkey(savedHotkey);

            // Initialize customizable global tasks toggle hotkey
            const savedTaskHotkey = store.get('taskHotkeyToggle', 'Alt+T');
            registerGlobalTaskHotkey(savedTaskHotkey);

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
            const { dialog } = require('electron');
            dialog.showErrorBox('Startup Error', error.message || String(error));
            // Remove app.quit() so it doesn't just disappear silently
        }
    });
} // End of gotTheLock block

async function createWindow() {
    isStartupGracePeriod = true;
    let { width, height, x, y } = store.get('windowBounds') || { width: 380, height: 460, x: undefined, y: undefined };
    width = Math.max(370, Math.round(width || 380));
    height = Math.max(430, Math.round(height || 460));
    if (x !== undefined) x = Math.round(x);
    if (y !== undefined) y = Math.round(y);

    // Validate that stored coordinates are actually visible on an active display
    if (x !== undefined && y !== undefined) {
        const displays = screen.getAllDisplays();
        const isVisibleOnAnyDisplay = displays.some(display => {
            const b = display.bounds;
            return (
                x + width > b.x + 50 &&
                x < b.x + b.width - 50 &&
                y + height > b.y + 50 &&
                y < b.y + b.height - 50
            );
        });
        if (!isVisibleOnAnyDisplay) {
            console.log('Stored window position was off-screen, resetting to center.');
            x = undefined;
            y = undefined;
        }
    }

    const alwaysOnTop = store.get('alwaysOnTop', false);
    const desktopMode = store.get('desktopMode', false);
    const lockPosition = store.get('lockPosition', false);

    mainWindow = new BrowserWindow({
        width,
        height,
        minWidth: 370,
        minHeight: 430,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: alwaysOnTop,
        type: desktopMode ? 'desktop' : undefined,
        skipTaskbar: true,
        movable: !lockPosition,
        resizable: !lockPosition,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Explicitly center if coordinates are undefined or reset
    if (x === undefined || y === undefined) {
        mainWindow.center();
    } else if (lockPosition) {
        // Enforce exact saved bounds if locked
        mainWindow.setBounds({ x, y, width, height });
    }

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
            // Pop to front above any full-screen browser/window on first show
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.focus();
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const keepTop = store.get('alwaysOnTop', false);
                    mainWindow.setAlwaysOnTop(keepTop, keepTop ? 'floating' : 'normal');
                }
            }, 1000);
        }

        // Release startup grace period after OS DPI and window initialization have settled
        setTimeout(() => {
            isStartupGracePeriod = false;
        }, 1500);
    }

    mainWindow.setMinimumSize(370, 430);

    mainWindow.on('will-resize', (event, newBounds) => {
        if (store.get('lockPosition', false) || newBounds.width < 370 || newBounds.height < 430) {
            event.preventDefault();
        }
    });

    mainWindow.on('resize', () => {
        if (!mainWindow || isStartupGracePeriod) return;
        const [w, h] = mainWindow.getSize();
        if (w < 370 || h < 430) {
            mainWindow.setSize(Math.max(370, w), Math.max(430, h));
            return;
        }
        saveBounds();
    });
    mainWindow.on('move', saveBounds);

    mainWindow.on('blur', () => {
        if (isPoppedByHotkey) {
            isPoppedByHotkey = false;
            if (mainWindow && !mainWindow.isDestroyed()) {
                const desktopMode = store.get('desktopMode', false);
                if (desktopMode) {
                    mainWindow.setAlwaysOnTop(false);
                    mainWindow.hide();
                    clearTimeout(desktopDismissTimeout);
                    desktopDismissTimeout = setTimeout(() => {
                        if (mainWindow && !mainWindow.isDestroyed() && !isPoppedByHotkey) {
                            mainWindow.showInactive();
                        }
                    }, 100);
                } else {
                    const keepTop = store.get('alwaysOnTop', false);
                    mainWindow.setAlwaysOnTop(keepTop, keepTop ? 'floating' : 'normal');
                }
            }
        }
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function saveBounds() {
    if (!mainWindow || isStartupGracePeriod) return;
    if (store.get('lockPosition', false)) return;

    clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        if (store.get('lockPosition', false)) return;
        const bounds = mainWindow.getBounds();
        const cleanBounds = {
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.max(370, Math.round(bounds.width)),
            height: Math.max(430, Math.round(bounds.height))
        };
        store.set('windowBounds', cleanBounds);
    }, 400);
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

function toggleWindowWithFocus() {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }

    const isCurrentlyActive = mainWindow.isVisible() && (mainWindow.isFocused() || isPoppedByHotkey);

    if (isCurrentlyActive) {
        // Dismiss
        isPoppedByHotkey = false;
        const desktopMode = store.get('desktopMode', false);
        if (desktopMode) {
            mainWindow.setAlwaysOnTop(false);
            mainWindow.blur();
            mainWindow.hide();
            clearTimeout(desktopDismissTimeout);
            desktopDismissTimeout = setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed() && !isPoppedByHotkey) {
                    mainWindow.showInactive();
                }
            }, 100);
        } else {
            const keepTop = store.get('alwaysOnTop', false);
            mainWindow.setAlwaysOnTop(keepTop, keepTop ? 'floating' : 'normal');
            mainWindow.hide();
        }
    } else {
        // Pop to front above all windows (bypassing desktopMode background restriction)
        clearTimeout(desktopDismissTimeout);
        isPoppedByHotkey = true;
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.moveTop();
        mainWindow.focus();
        try {
            app.focus({ steal: true });
        } catch (_e) {}
    }
}

function registerGlobalToggleHotkey(accelerator) {
    if (currentHotkeyToggle) {
        try {
            globalShortcut.unregister(currentHotkeyToggle);
        } catch (_e) {}
        currentHotkeyToggle = null;
    }

    if (!accelerator || accelerator === 'none') {
        store.set('hotkeyToggle', 'none');
        return { success: true, hotkey: 'none' };
    }

    try {
        const ok = globalShortcut.register(accelerator, () => {
            console.log(`Global toggle shortcut (${accelerator}) triggered.`);
            toggleWindowWithFocus();
        });

        if (ok) {
            currentHotkeyToggle = accelerator;
            store.set('hotkeyToggle', accelerator);
            console.log(`Successfully registered global toggle hotkey: ${accelerator}`);
            return { success: true, hotkey: accelerator };
        } else {
            console.warn(`Failed to register global toggle hotkey: ${accelerator}`);
            return { success: false, error: 'Shortcut already in use or unavailable' };
        }
    } catch (err) {
        console.error('Error registering global hotkey:', err);
        return { success: false, error: err.message };
    }
}

function toggleTasksWithFocus() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }

    const isVisible = mainWindow.isVisible();
    const isCurrentlyActive = isVisible && (mainWindow.isFocused() || isPoppedByHotkey);
    const currentlyOpen = store.get('isTaskDrawerOpen', false);

    if (isCurrentlyActive && currentlyOpen) {
        // Task drawer is already open and window active: close drawer
        store.set('isTaskDrawerOpen', false);
        mainWindow.webContents.send('set-task-drawer-state', false);
    } else {
        // Open drawer and bring window to front
        store.set('isTaskDrawerOpen', true);
        mainWindow.webContents.send('set-task-drawer-state', true);

        if (!isVisible || !isCurrentlyActive) {
            clearTimeout(desktopDismissTimeout);
            isPoppedByHotkey = true;
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.moveTop();
            mainWindow.focus();
            try {
                app.focus({ steal: true });
            } catch (_e) {}
        }
    }
}

function registerGlobalTaskHotkey(accelerator) {
    if (currentTaskHotkeyToggle) {
        try {
            globalShortcut.unregister(currentTaskHotkeyToggle);
        } catch (_e) {}
        currentTaskHotkeyToggle = null;
    }

    if (!accelerator || accelerator === 'none') {
        store.set('taskHotkeyToggle', 'none');
        return { success: true, hotkey: 'none' };
    }

    try {
        const ok = globalShortcut.register(accelerator, () => {
            console.log(`Global task shortcut (${accelerator}) triggered.`);
            toggleTasksWithFocus();
        });

        if (ok) {
            currentTaskHotkeyToggle = accelerator;
            store.set('taskHotkeyToggle', accelerator);
            console.log(`Successfully registered global task hotkey: ${accelerator}`);
            return { success: true, hotkey: accelerator };
        } else {
            console.warn(`Failed to register global task hotkey: ${accelerator}`);
            return { success: false, error: 'Shortcut already in use or unavailable' };
        }
    } catch (err) {
        console.error('Error registering global task hotkey:', err);
        return { success: false, error: err.message };
    }
}


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


// IPC Handlers
ipcMain.handle('get-calendars', async () => {
    if (!authClient) authClient = await authenticate();
    const primaryEmail = store.get('primaryEmail', 'Primary');
    const primaryCals = (await getCalendars(authClient)).map(cal => ({ ...cal, accountEmail: primaryEmail, isPrimary: true }));

    const additionalAccounts = store.get('additionalAccounts', []).filter(a => a.enabled !== false);
    const additionalCals = (await Promise.all(
        additionalAccounts.map(async acc => {
            try {
                const client = createAuthClientForAccount(acc);
                const cals = await getCalendars(client);
                return cals.map(cal => ({ ...cal, accountEmail: acc.email, isPrimary: false }));
            } catch (e) {
                console.error(`Could not get calendars for ${acc.email}:`, e.message);
                return [];
            }
        })
    )).flat();

    return [...primaryCals, ...additionalCals];
});

ipcMain.handle('get-events', async (event, { timeMin, timeMax, selectedCalendarIds }) => {
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

        console.log('Fetching events via listEvents...');
        const timeMinDate = new Date(timeMin);
        const timeMaxDate = new Date(timeMax);

        // Primary account
        const primaryEnabled = store.get('primaryAccountEnabled', true);
        const primaryEmail = store.get('primaryEmail', 'Primary');
        let primaryEvents = [];
        if (primaryEnabled) {
            primaryEvents = (await withTimeout(listEvents(authClient, timeMinDate, timeMaxDate, selectedCalendarIds), 10000))
                .map(ev => ({ ...ev, accountEmail: primaryEmail }));
        }

        // Additional accounts (silent fail — never break primary)
        const additionalAccounts = store.get('additionalAccounts', []).filter(a => a.enabled !== false);
        const additionalResults = await Promise.all(
            additionalAccounts.map(async acc => {
                try {
                    const client = createAuthClientForAccount(acc);
                    const evs = await withTimeout(listEvents(client, timeMinDate, timeMaxDate, selectedCalendarIds), 10000);
                    return evs.map(ev => ({ ...ev, accountEmail: acc.email }));
                } catch (e) {
                    console.warn(`Additional account ${acc.email} failed:`, e.message);
                    return [];
                }
            })
        );

        return [...primaryEvents, ...additionalResults.flat()];
    } catch (err) {
        console.error('API Error in get-events:', err.message);
        
        const isNetworkError = typeof err.code === 'string' && ['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ERR_INTERNET_DISCONNECTED', 'EHOSTUNREACH', 'ENETUNREACH'].includes(err.code);
        
        const isAuthError = !isNetworkError && (
                           err.code === 401 || 
                           (err.code === 400 && err.message.toLowerCase().includes('invalid_grant')) ||
                           err.message.toLowerCase().includes('expired') ||
                           err.message.toLowerCase().includes('revoked') ||
                           err.message.toLowerCase().includes('invalid_grant')
        );

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
        store.delete('primaryEmail');
        fetchAndStorePrimaryEmail().catch(() => {});
        console.log('Manual re-authentication successful.');
        if (mainWindow) mainWindow.webContents.send('sync-now');
        return { success: true };
    } catch (err) {
        console.error('Manual re-authentication failed:', err.message);
        throw err;
    }
});

// ── Multi-account IPC handlers ────────────────────────────────────────────

ipcMain.handle('get-accounts', async () => {
    // Eagerly fetch primary email if not stored yet
    if (!store.get('primaryEmail')) {
        await fetchAndStorePrimaryEmail();
    }
    const primaryEmail = store.get('primaryEmail', 'Primary Account');
    const primaryEnabled = store.get('primaryAccountEnabled', true);
    const additionalAccounts = store.get('additionalAccounts', []);
    return {
        primary: { email: primaryEmail, enabled: primaryEnabled },
        additional: additionalAccounts.map(({ email, enabled }) => ({ email, enabled: enabled !== false }))
    };
});

ipcMain.handle('add-account', async () => {
    try {
        const { email, token, client } = await authenticateNewAccount();
        const primaryEmail = store.get('primaryEmail');
        if (email === primaryEmail) {
            return { success: false, error: 'This account is already connected as the primary account.' };
        }
        const accounts = store.get('additionalAccounts', []);
        if (accounts.find(a => a.email === email)) {
            return { success: false, error: 'This account is already added.' };
        }
        // Auto-add new account's calendars to selectedCalendarIds
        try {
            const newCals = await getCalendars(client);
            const currentSelected = store.get('selectedCalendarIds');
            if (currentSelected !== null && Array.isArray(currentSelected)) {
                store.set('selectedCalendarIds', [...currentSelected, ...newCals.map(c => c.id)]);
            }
        } catch (e) { console.warn('Could not auto-select calendars for new account:', e.message); }

        accounts.push({ email, token, enabled: true });
        store.set('additionalAccounts', accounts);
        if (mainWindow) mainWindow.webContents.send('sync-now');
        return { success: true, email };
    } catch (e) {
        console.error('add-account failed:', e.message);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('remove-account', async (event, email) => {
    const accounts = store.get('additionalAccounts', []);
    store.set('additionalAccounts', accounts.filter(a => a.email !== email));
    if (mainWindow) mainWindow.webContents.send('sync-now');
    return { success: true };
});

ipcMain.on('toggle-account', (event, { email, enabled }) => {
    if (!email) return;
    const primaryEmail = store.get('primaryEmail', '');
    if (email === primaryEmail) {
        store.set('primaryAccountEnabled', enabled);
    } else {
        const accounts = store.get('additionalAccounts', []);
        const idx = accounts.findIndex(a => a.email === email);
        if (idx !== -1) { accounts[idx].enabled = enabled; store.set('additionalAccounts', accounts); }
    }
    if (mainWindow) mainWindow.webContents.send('sync-now');
});

ipcMain.handle('install-update', () => {
    console.log('Install update requested from renderer...');
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
    
    // Fallback: forcefully exit after 1.5 seconds to guarantee NSIS installer 
    // doesn't throw the "cannot be closed" error if graceful quit hangs.
    setTimeout(() => {
        app.exit(0);
    }, 1500);
});

function getAuthClientForAccountEmail(email) {
    const primaryEmail = store.get('primaryEmail');
    if (!email || email === primaryEmail) return authClient;
    const accounts = store.get('additionalAccounts', []);
    const acc = accounts.find(a => a.email === email);
    if (acc) return createAuthClientForAccount(acc);
    return authClient;
}

ipcMain.handle('create-event', async (event, eventData) => {
    return await createEvent(authClient, eventData);
});

ipcMain.handle('update-event', async (event, { calendarId, eventId, eventData, accountEmail }) => {
    const client = getAuthClientForAccountEmail(accountEmail);
    return await updateEvent(client, calendarId, eventId, eventData);
});

ipcMain.handle('delete-event', async (event, { calendarId, eventId, accountEmail }) => {
    const client = getAuthClientForAccountEmail(accountEmail);
    return await deleteEvent(client, calendarId, eventId);
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
        mainWindow.setResizable(!value);
        store.set('lockPosition', value);
        if (value) {
            clearTimeout(saveBoundsTimeout);
            const bounds = mainWindow.getBounds();
            const cleanBounds = {
                x: Math.round(bounds.x),
                y: Math.round(bounds.y),
                width: Math.max(370, Math.round(bounds.width)),
                height: Math.max(430, Math.round(bounds.height))
            };
            store.set('windowBounds', cleanBounds);
        }
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
        'today-color': store.get('today-color', '#ffcc00'),
        'bg-opacity': store.get('bg-opacity', 0.92),
        startOfWeek: store.get('startOfWeek', 0),
        defaultViewMode: store.get('defaultViewMode', 'month'),
        timeDisplayStyle: store.get('timeDisplayStyle', 'badge'),
        selectedCalendarIds: store.get('selectedCalendarIds', null),
        soundEnabled: store.get('soundEnabled', true),
        notificationsEnabled: store.get('notificationsEnabled', false),
        notifyMinutesBefore: store.get('notifyMinutesBefore', 15),
        hotkeyToggle: store.get('hotkeyToggle', 'CommandOrControl+Shift+C'),
        taskHotkeyToggle: store.get('taskHotkeyToggle', 'Alt+T'),
        version: app.getVersion()
    };
});

ipcMain.handle('set-hotkey-toggle', (_event, accelerator) => {
    return registerGlobalToggleHotkey(accelerator);
});

ipcMain.handle('set-task-hotkey-toggle', (_event, accelerator) => {
    return registerGlobalTaskHotkey(accelerator);
});

ipcMain.on('set-default-view-mode', (event, value) => {
    store.set('defaultViewMode', value);
});

ipcMain.on('fire-notification', (event, { title, body }) => {
    try {
        new Notification({ title, body }).show();
    } catch(e) {
        console.error('Notification failed:', e);
    }
});


ipcMain.on('set-time-display-style', (event, value) => {
    store.set('timeDisplayStyle', value);
});

ipcMain.on('set-start-of-week', (event, value) => {
    store.set('startOfWeek', value);
});

ipcMain.on('set-selected-calendars', (event, value) => {
    store.set('selectedCalendarIds', value);
});

// ── Local Tasks & Google Tasks Drawer Management ──────────
ipcMain.handle('get-local-tasks', () => {
    return store.get('localTasks', []);
});

ipcMain.handle('save-local-tasks', (_event, tasks) => {
    store.set('localTasks', tasks);
    return true;
});

ipcMain.handle('get-tasks-sync-config', () => {
    return {
        mode: store.get('tasksSourceMode', 'local'), // 'local' | 'google'
        hasScope: hasTasksScope(),
        selectedTasklistId: store.get('selectedTasklistId', '@default')
    };
});

ipcMain.handle('set-tasks-sync-config', (_event, config = {}) => {
    if (config.mode) store.set('tasksSourceMode', config.mode);
    if (config.selectedTasklistId) store.set('selectedTasklistId', config.selectedTasklistId);
    return {
        mode: store.get('tasksSourceMode', 'local'),
        hasScope: hasTasksScope(),
        selectedTasklistId: store.get('selectedTasklistId', '@default')
    };
});

ipcMain.handle('authorize-google-tasks', async () => {
    try {
        authClient = await authenticateTasksScope();
        store.set('tasksSourceMode', 'google');
        const taskLists = await getTaskLists(authClient);
        return { success: true, hasScope: true, taskLists };
    } catch (err) {
        console.error('Google Tasks authorization failed:', err.message);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-google-tasklists', async () => {
    try {
        if (!authClient) authClient = await authenticate();
        return await getTaskLists(authClient);
    } catch (err) {
        console.error('Failed to get Google Task lists:', err.message);
        throw err;
    }
});

ipcMain.handle('get-google-tasks', async (_event, tasklistId) => {
    try {
        if (!authClient) authClient = await authenticate();
        const listId = tasklistId || store.get('selectedTasklistId', '@default');
        return await listGoogleTasks(authClient, listId);
    } catch (err) {
        console.error('Failed to list Google Tasks:', err.message);
        throw err;
    }
});

ipcMain.handle('create-google-task', async (_event, { tasklistId, taskData }) => {
    if (!authClient) authClient = await authenticate();
    const listId = tasklistId || store.get('selectedTasklistId', '@default');
    return await createGoogleTask(authClient, listId, taskData);
});

ipcMain.handle('update-google-task', async (_event, { tasklistId, taskId, patchData }) => {
    if (!authClient) authClient = await authenticate();
    const listId = tasklistId || store.get('selectedTasklistId', '@default');
    return await updateGoogleTask(authClient, listId, taskId, patchData);
});

ipcMain.handle('delete-google-task', async (_event, { tasklistId, taskId }) => {
    if (!authClient) authClient = await authenticate();
    const listId = tasklistId || store.get('selectedTasklistId', '@default');
    return await deleteGoogleTask(authClient, listId, taskId);
});

ipcMain.handle('clear-completed-google-tasks', async (_event, tasklistId) => {
    if (!authClient) authClient = await authenticate();
    const listId = tasklistId || store.get('selectedTasklistId', '@default');
    return await clearCompletedGoogleTasks(authClient, listId);
});

ipcMain.handle('get-drawer-state', () => {
    return store.get('isTaskDrawerOpen', false);
});

ipcMain.handle('toggle-task-drawer', (_event, shouldOpen) => {
    if (!mainWindow) return false;
    const currentlyOpen = store.get('isTaskDrawerOpen', false);
    const targetState = (shouldOpen !== undefined) ? shouldOpen : !currentlyOpen;

    if (targetState !== currentlyOpen) {
        store.set('isTaskDrawerOpen', targetState);
    }
    return targetState;
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
    
    const args = app.isPackaged ? ['--hidden'] : [app.getAppPath(), '--hidden'];
    const loginSettings = {
        openAtLogin: value,
        path: process.execPath,
        args: args
    };
    app.setLoginItemSettings(loginSettings);
    
    if (tray) createTray();
}

ipcMain.on('set-login-settings', (event, settings) => {
    updateLoginSettings(settings.openAtLogin);
});

function setupAutoUpdater() {
    try {
        autoUpdater.on('update-available', (info) => {
        new Notification({
            title: 'Calendar-On-Demand',
            body: `A new update (v${info.version}) is available. Downloading now...`
        }).show();
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info.version);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        new Notification({
            title: 'Calendar-On-Demand',
            body: `Update v${info.version} downloaded. Click to install.`
        }).show();
        if (mainWindow) {
            mainWindow.webContents.send('update-downloaded', info.version);
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err);
    });

        // Check for updates on startup, then every 24 hours
        autoUpdater.checkForUpdatesAndNotify().catch(e => console.error('Update check failed:', e));
        setInterval(() => {
            autoUpdater.checkForUpdatesAndNotify().catch(e => console.error('Update check failed:', e));
        }, 24 * 60 * 60 * 1000);
    } catch (err) {
        console.error('Failed to initialize auto-updater:', err);
    }
}
