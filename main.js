const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const scanner = require('./utils/scanner');
const metadataParser = require('./utils/metadata');

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        backgroundColor: '#121212',
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message}`);
    });
};

app.whenReady().then(() => {
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

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
