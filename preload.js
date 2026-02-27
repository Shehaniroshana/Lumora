const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    openImage: () => ipcRenderer.invoke('dialog:openImage'),
    getDefaultDirs: () => ipcRenderer.invoke('fs:getDefaultDirs'),
    scanDirectories: (dirs) => ipcRenderer.invoke('fs:scanDirectories', dirs),
    parseMetadata: (filePath) => ipcRenderer.invoke('fs:parseMetadata', filePath),
    // To allow the audio element to play local files, we'll need to use local protocols or file:// URIs.
    // In later Electron versions with webSecurity enabled, file:// might have restrictions.
    // For now, we will construct file:// URIs in the renderer.
    getFileUri: (filePath) => `file://${filePath}`
});
