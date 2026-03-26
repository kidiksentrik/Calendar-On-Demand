const { google } = require('googleapis');
const Store = require('electron-store');
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const store = new Store();

async function getOAuthClient() {
    console.log('Loading credentials.json...');
    const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json')));
    const { client_id, client_secret, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    console.log('Checking for stored token...');
    const token = store.get('token');
    if (token) {
        console.log('Stored token found, setting credentials...');
        oAuth2Client.setCredentials(token);
        
        oAuth2Client.on('tokens', (tokens) => {
            console.log('New tokens received, updating store...');
            const currentToken = store.get('token');
            store.set('token', { ...currentToken, ...tokens });
        });
    }

    return oAuth2Client;
}

async function authenticate(force = false) {
    console.log('getting OAuth client...');
    const oAuth2Client = await getOAuthClient();
    console.log('OAuth client ready.');
    
    if (force) {
        console.log('Forced re-authentication, clearing stored token...');
        store.delete('token');
    }

    const token = store.get('token');

    if (token && !force) {
        console.log('Authentication complete (stored token).');
        return oAuth2Client;
    }

    console.log('No stored token, starting BrowserWindow auth flow...');
    return new Promise((resolve, reject) => {

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        const authWindow = new BrowserWindow({
            width: 500,
            height: 600,
            show: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        authWindow.loadURL(authUrl);

        let isResolved = false;

        const handleRedirect = async (urlStr) => {
            if (urlStr.includes('code=')) {
                const url = new URL(urlStr);
                const code = url.searchParams.get('code');
                
                if (code) {
                    isResolved = true;
                    authWindow.destroy();
                    try {
                        const { tokens } = await oAuth2Client.getToken(code);
                        oAuth2Client.setCredentials(tokens);
                        store.set('token', tokens);
                        resolve(oAuth2Client);
                    } catch (e) {
                        reject(e);
                    }
                }
            }
        };

        authWindow.webContents.on('will-navigate', (event, url) => {
            handleRedirect(url);
        });

        authWindow.webContents.on('will-redirect', (event, url) => {
            handleRedirect(url);
        });

        authWindow.on('closed', () => {
            if (!isResolved) {
                reject(new Error('User closed the auth window'));
            }
        });

    });
}

module.exports = { authenticate, getOAuthClient };
