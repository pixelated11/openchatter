const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

function ensureConfig() {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (!fs.existsSync(configPath)) {
        const defaults = {
            apiKey: 'YOUR_API_KEY',
            baseURL: 'API_ENDPOINT',
            model: 'PREFERED_MODEL'
        };
        fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
    }
    return configPath;
}

function ensureSessions() {
    const sessionsPath = path.join(app.getPath('userData'), 'sessions.json');
    if (!fs.existsSync(sessionsPath)) {
        fs.writeFileSync(sessionsPath, JSON.stringify({ nextId: 1, sessions: [] }, null, 2));
    }
    return sessionsPath;
}

function createWindow() {
    const platform = process.platform;
    const iconFile = {
        win32:  'assets/icon.ico',
        darwin: 'assets/icon.icns',
        linux:  'assets/icon.png',
    }[platform] ?? 'assets/icon.png';

    const icon = nativeImage.createFromPath(path.join(__dirname, iconFile));

    win = new BrowserWindow({
        width: 1100,
        height: 720,
        minWidth: 700,
        minHeight: 500,
        icon,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: true,
            spellcheck: false
        },
    });

    win.loadFile('index.html');
}

ipcMain.handle('get-config-path', () => ensureConfig());
ipcMain.handle('save-config', (event, data) => {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    return true;
});

ipcMain.handle('get-sessions-path', () => ensureSessions());
ipcMain.handle('save-sessions', (event, data) => {
    const sessionsPath = path.join(app.getPath('userData'), 'sessions.json');
    fs.writeFileSync(sessionsPath, JSON.stringify(data, null, 2));
    return true;
});
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128'); // limit JS heap to 128MB, to reduce memory usage
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.whenReady().then(() => {
    ensureConfig();
    ensureSessions();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});