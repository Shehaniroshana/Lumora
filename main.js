const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const scanner = require('./utils/scanner');
const metadataParser = require('./utils/metadata');
const Store = require('electron-store');

// Initialize electron-store
const store = new Store();

// Auto-updater (only in production)
const isDev = !app.isPackaged;
let autoUpdater = null;
let mainWindow;

if (!isDev) {
    try {
        autoUpdater = require('electron-updater').autoUpdater;
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        // Auto-updater event listeners
        autoUpdater.on('checking-for-update', () => {
            if (mainWindow) {
                mainWindow.webContents.send('update:checking');
            }
        });

        autoUpdater.on('update-available', (info) => {
            if (mainWindow) {
                mainWindow.webContents.send('update:available', info);
            }
        });

        autoUpdater.on('update-not-available', (info) => {
            if (mainWindow) {
                mainWindow.webContents.send('update:not-available', info);
            }
        });

        autoUpdater.on('error', (err) => {
            if (mainWindow) {
                mainWindow.webContents.send('update:error', err.message);
            }
        });

        autoUpdater.on('download-progress', (progressObj) => {
            if (mainWindow) {
                mainWindow.webContents.send('update:download-progress', progressObj);
            }
        });

        autoUpdater.on('update-downloaded', (info) => {
            if (mainWindow) {
                mainWindow.webContents.send('update:downloaded', info);
            }
        });
    } catch (err) {
        console.log('Auto-updater not available:', err.message);
    }
}

// Suppress Linux/systemd dbus transient unit conflict warning
app.commandLine.appendSwitch('disable-features', 'MediaSessionService');

// Memory and performance optimizations
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableWebSQL: false,
            // Memory optimizations
            backgroundThrottling: true,
        },
        autoHideMenuBar: true,
        backgroundColor: '#121212',
        icon: path.join(__dirname, 'assets', 'new.png'),
    });

    mainWindow.loadFile('index.html');

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message}`);
    });
};

app.whenReady().then(() => {
    
    // Clear cache on startup to free memory
    session.defaultSession.clearCache();

    // Open a folder dialog and return selected paths
    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory', 'multiSelections']
        });
        if (canceled) return [];
        return filePaths;
    });

    // Open image file dialog
    ipcMain.handle('dialog:openImage', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] }
            ]
        });
        if (canceled) return null;
        return filePaths[0]; // Retun solitary file path
    });

    // Open file dialog (generic)
    ipcMain.handle('dialog:openFile', async (event, options) => {
        const { canceled, filePaths } = await dialog.showOpenDialog(options);
        if (canceled) return [];
        return filePaths;
    });

    // Check if file exists
    ipcMain.handle('fs:fileExists', async (event, filePath) => {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    });

    // Get default music folders
    ipcMain.handle('fs:getDefaultDirs', () => {
        return [
            app.getPath('music'),
            app.getPath('downloads')
        ];
    });

    // Scan directories for mp3 files
    ipcMain.handle('fs:scanDirectories', async (event, dirs) => {
        let allFiles = [];
        for (const dir of dirs) {
            try {
                const files = await scanner.scanDirectory(dir);
                allFiles = allFiles.concat(files);
            } catch (error) {
                console.error(`Error scanning directory ${dir}:`, error);
            }
        }
        // Deduplicate files
        return [...new Set(allFiles)];
    });

    // Read file metadata
    ipcMain.handle('fs:parseMetadata', async (event, filePath) => {
        try {
            return await metadataParser.parse(filePath);
        } catch (error) {
            console.error(`Error parsing metadata for ${filePath}:`, error);
            // Return basic info as fallback
            return {
                title: path.basename(filePath, '.mp3'),
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                genre: [],
                duration: 0,
                picture: null,
                path: filePath
            };
        }
    });

    ipcMain.handle('fs:rename', async (event, oldPath, newName) => {
        try {
            const dir = path.dirname(oldPath);
            const ext = path.extname(oldPath);
            // Ensure no malicious slashes
            const safeName = newName.replace(/[\\/:\*\?"<>\|]/g, '');
            const newPath = path.join(dir, safeName + ext);
            await fs.rename(oldPath, newPath);
            return { success: true, newPath };
        } catch (error) {
            console.error('Rename failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('fs:delete', async (event, filePath) => {
        try {
            await shell.trashItem(filePath);
            return { success: true };
        } catch (error) {
            console.error('Delete failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('fs:reveal', async (event, filePath) => {
        shell.showItemInFolder(filePath);
    });

    // electron-store IPC handlers
    ipcMain.handle('store:get', (event, key) => {
        return store.get(key);
    });

    ipcMain.handle('store:set', (event, key, value) => {
        store.set(key, value);
    });

    ipcMain.handle('store:delete', (event, key) => {
        store.delete(key);
    });

    ipcMain.handle('store:clear', () => {
        store.clear();
    });

    // Auto-updater IPC handlers
    ipcMain.handle('update:check', async () => {
        if (!autoUpdater) {
            return { error: 'Auto-updater not available in development mode' };
        }
        try {
            return await autoUpdater.checkForUpdates();
        } catch (error) {
            console.error('Update check failed:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('update:download', async () => {
        if (!autoUpdater) {
            return { error: 'Auto-updater not available in development mode' };
        }
        try {
            return await autoUpdater.downloadUpdate();
        } catch (error) {
            console.error('Update download failed:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('update:install', () => {
        if (!autoUpdater) {
            return { error: 'Auto-updater not available in development mode' };
        }
        autoUpdater.quitAndInstall();
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
