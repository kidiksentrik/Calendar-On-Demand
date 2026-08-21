const { google } = require('googleapis');
const Store = require('electron-store');
const { session, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const store = new Store();
let authPromise = null;

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
    if (authPromise) {
        console.log('Authentication already in progress, returning existing promise...');
        return authPromise;
    }

    authPromise = (async () => {
        try {
            const result = await _authenticateInternal(force);
            authPromise = null;
            return result;
        } catch (error) {
            authPromise = null;
            throw error;
        }
    })();

    return authPromise;
}

async function _authenticateInternal(force = false) {
    console.log('getting OAuth client...');
    const oAuth2Client = await getOAuthClient();
    console.log('OAuth client ready.');
    
    if (force) {
        console.log('Forced re-authentication, clearing stored token and session data...');
        store.delete('token');
        await session.defaultSession.clearStorageData();
    }

    const token = store.get('token');

    if (token && !force) {
        console.log('Authentication complete (stored token).');
        return oAuth2Client;
    }

    console.log('No stored token, starting System Browser auth flow...');
    return new Promise((resolve, reject) => {

        let server;
        let isResolved = false;

        const cleanup = () => {
            if (server) {
                server.close();
                server = null;
            }
        };

        server = http.createServer(async (req, res) => {
            try {
                const parsedUrl = new URL(req.url, `http://127.0.0.1:${server.address().port}`);
                const code = parsedUrl.searchParams.get('code');
                const error = parsedUrl.searchParams.get('error');

                if (code) {
                    isResolved = true;
                    
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><head><style>body{font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#0a0a0c; color:#fff; text-align:center;}</style></head><body><h2>Authentication Successful!</h2><p>You can close this tab and return to Calendar-On-Demand.</p></body></html>');
                    
                    cleanup();

                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);
                    store.set('token', tokens);
                    resolve(oAuth2Client);
                } else if (error) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h2>Authentication Failed</h2><p>You can close this tab.</p></body></html>');
                    cleanup();
                    reject(new Error('Authentication rejected by user.'));
                } else {
                    res.writeHead(404);
                    res.end();
                }
            } catch (e) {
                cleanup();
                reject(e);
            }
        });

        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            console.log(`Local server listening on port ${port} for OAuth callback...`);
            
            oAuth2Client.redirectUri = `http://127.0.0.1:${port}`;
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                prompt: 'consent'
            });

            shell.openExternal(authUrl);
        });

        server.on('error', (err) => {
            console.error('Error starting local server:', err);
            // Fallback to random port if 80 is in use, but redirect_uris in credentials might not match.
            // Assuming port 80 works for http://localhost in standard environments.
            reject(err);
        });
    });
}

module.exports = { authenticate, getOAuthClient };
