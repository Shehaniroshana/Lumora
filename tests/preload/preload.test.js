/**
 * Test Suite: preload.js — Electron API Bridge
 * Tests the shape of the exposed electronAPI on the context bridge
 */

const mockIpcRenderer = {
    invoke: jest.fn(),
    on: jest.fn(),
};

jest.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: jest.fn(),
    },
    ipcRenderer: mockIpcRenderer,
}));

// Load preload to capture what gets exposed
require('../../preload');

const { contextBridge } = require('electron');

describe('Preload — electronAPI exposure', () => {
    let exposedApi;

    beforeAll(() => {
        // contextBridge.exposeInMainWorld was called with ('electronAPI', { ... })
        expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
            'electronAPI',
            expect.any(Object)
        );
        exposedApi = contextBridge.exposeInMainWorld.mock.calls[0][1];
    });

    describe('Dialog methods', () => {
        test('should expose openDirectory', () => {
            expect(typeof exposedApi.openDirectory).toBe('function');
        });

        test('should expose openImage', () => {
            expect(typeof exposedApi.openImage).toBe('function');
        });

        test('should expose openFileDialog', () => {
            expect(typeof exposedApi.openFileDialog).toBe('function');
        });

        test('openDirectory should invoke correct IPC channel', () => {
            exposedApi.openDirectory();
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:openDirectory');
        });

        test('openImage should invoke correct IPC channel', () => {
            exposedApi.openImage();
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:openImage');
        });

        test('openFileDialog should pass options', () => {
            const opts = { properties: ['openFile'] };
            exposedApi.openFileDialog(opts);
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dialog:openFile', opts);
        });
    });

    describe('File system methods', () => {
        test('should expose getDefaultDirs', () => {
            expect(typeof exposedApi.getDefaultDirs).toBe('function');
        });

        test('should expose scanDirectories', () => {
            expect(typeof exposedApi.scanDirectories).toBe('function');
        });

        test('should expose parseMetadata', () => {
            expect(typeof exposedApi.parseMetadata).toBe('function');
        });

        test('should expose fileExists', () => {
            expect(typeof exposedApi.fileExists).toBe('function');
        });

        test('should expose getFileUri', () => {
            expect(typeof exposedApi.getFileUri).toBe('function');
        });

        test('should expose renameFile', () => {
            expect(typeof exposedApi.renameFile).toBe('function');
        });

        test('should expose revealInFolder', () => {
            expect(typeof exposedApi.revealInFolder).toBe('function');
        });

        test('should expose deleteFile', () => {
            expect(typeof exposedApi.deleteFile).toBe('function');
        });

        test('getFileUri should return a file:// URI', () => {
            const uri = exposedApi.getFileUri('/home/user/Music/song.mp3');
            expect(uri).toBe('file:///home/user/Music/song.mp3');
        });

        test('scanDirectories should invoke correct IPC channel', () => {
            const dirs = ['/dir1', '/dir2'];
            exposedApi.scanDirectories(dirs);
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:scanDirectories', dirs);
        });

        test('parseMetadata should invoke correct IPC channel', () => {
            exposedApi.parseMetadata('/song.mp3');
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fs:parseMetadata', '/song.mp3');
        });
    });

    describe('Store methods', () => {
        test('should expose store object', () => {
            expect(exposedApi.store).toBeDefined();
            expect(typeof exposedApi.store).toBe('object');
        });

        test('should expose store.get', () => {
            expect(typeof exposedApi.store.get).toBe('function');
            exposedApi.store.get('favorites');
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('store:get', 'favorites');
        });

        test('should expose store.set', () => {
            expect(typeof exposedApi.store.set).toBe('function');
            exposedApi.store.set('favorites', ['a']);
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('store:set', 'favorites', ['a']);
        });

        test('should expose store.delete', () => {
            expect(typeof exposedApi.store.delete).toBe('function');
            exposedApi.store.delete('favorites');
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('store:delete', 'favorites');
        });

        test('should expose store.clear', () => {
            expect(typeof exposedApi.store.clear).toBe('function');
            exposedApi.store.clear();
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('store:clear');
        });
    });

    describe('Updater methods', () => {
        test('should expose updater object', () => {
            expect(exposedApi.updater).toBeDefined();
            expect(typeof exposedApi.updater).toBe('object');
        });

        test('should expose updater.checkForUpdates', () => {
            expect(typeof exposedApi.updater.checkForUpdates).toBe('function');
            exposedApi.updater.checkForUpdates();
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('update:check');
        });

        test('should expose updater.downloadUpdate', () => {
            expect(typeof exposedApi.updater.downloadUpdate).toBe('function');
            exposedApi.updater.downloadUpdate();
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('update:download');
        });

        test('should expose updater.installUpdate', () => {
            expect(typeof exposedApi.updater.installUpdate).toBe('function');
            exposedApi.updater.installUpdate();
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('update:install');
        });

        test('should register event listeners for update events', () => {
            const callback = jest.fn();

            exposedApi.updater.onChecking(callback);
            expect(mockIpcRenderer.on).toHaveBeenCalledWith('update:checking', callback);

            exposedApi.updater.onAvailable(callback);
            expect(mockIpcRenderer.on).toHaveBeenCalledWith('update:available', expect.any(Function));

            exposedApi.updater.onNotAvailable(callback);
            expect(mockIpcRenderer.on).toHaveBeenCalledWith('update:not-available', expect.any(Function));

            exposedApi.updater.onError(callback);
            expect(mockIpcRenderer.on).toHaveBeenCalledWith('update:error', expect.any(Function));

            exposedApi.updater.onDownloadProgress(callback);
            expect(mockIpcRenderer.on).toHaveBeenCalledWith('update:download-progress', expect.any(Function));

            exposedApi.updater.onDownloaded(callback);
            expect(mockIpcRenderer.on).toHaveBeenCalledWith('update:downloaded', expect.any(Function));
        });
    });
});
