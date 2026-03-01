const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    openImage: () => ipcRenderer.invoke('dialog:openImage'),
    openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
    getDefaultDirs: () => ipcRenderer.invoke('fs:getDefaultDirs'),
    scanDirectories: (dirs) => ipcRenderer.invoke('fs:scanDirectories', dirs),
    parseMetadata: (filePath) => ipcRenderer.invoke('fs:parseMetadata', filePath),
    fileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),
    // To allow the audio element to play local files, we'll need to use local protocols or file:// URIs.
    // In later Electron versions with webSecurity enabled, file:// might have restrictions.
    getFileUri: (filePath) => `file://${filePath}`,
    renameFile: (oldPath, newName) => ipcRenderer.invoke('fs:rename', oldPath, newName),
    revealInFolder: (filePath) => ipcRenderer.invoke('fs:reveal', filePath),
    deleteFile: (filePath) => ipcRenderer.invoke('fs:delete', filePath)
});
