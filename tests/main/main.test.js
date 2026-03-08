/**
 * Test Suite: main.js — Main Process (Electron)
 * Tests IPC handler registration, window creation, and app lifecycle
 *
 * These tests mock Electron APIs since the main process cannot be
 * imported directly in a Node.js test runner.
 */

// ============ Mocks ============

const mockStore = {
    get: jest.fn((key) => undefined),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
};

const mockDialog = {
    showOpenDialog: jest.fn(),
};

const mockShell = {
    showItemInFolder: jest.fn(),
    trashItem: jest.fn().mockResolvedValue(undefined),
};

const mockSession = {
    defaultSession: { clearCache: jest.fn() },
};

const ipcHandlers = {};
const mockIpcMain = {
    handle: jest.fn((channel, handler) => {
        ipcHandlers[channel] = handler;
    }),
};

const mockApp = {
    isPackaged: false,
    whenReady: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    getPath: jest.fn((name) => {
        if (name === 'music') return '/home/user/Music';
        if (name === 'downloads') return '/home/user/Downloads';
        return '/home/user';
    }),
    commandLine: { appendSwitch: jest.fn() },
    quit: jest.fn(),
};

const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    webContents: {
        send: jest.fn(),
        on: jest.fn(),
    },
}));
mockBrowserWindow.getAllWindows = jest.fn().mockReturnValue([]);

jest.mock('electron', () => ({
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    dialog: mockDialog,
    session: mockSession,
    shell: mockShell,
}));

jest.mock('electron-store', () => {
    return jest.fn().mockImplementation(() => mockStore);
});

jest.mock('../../utils/scanner', () => ({
    scanDirectory: jest.fn().mockResolvedValue(['/music/song1.mp3', '/music/song2.mp3']),
}));

jest.mock('../../utils/metadata', () => ({
    parse: jest.fn().mockResolvedValue({
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        genre: ['Rock'],
        duration: 180,
        picture: null,
        path: '/music/song1.mp3',
    }),
}));

// ============ Load main process (triggers whenReady) ============
beforeAll(async () => {
    require('../../main');
    // Execute the whenReady callback
    const readyCallback = mockApp.whenReady.mock.results[0].value;
    await readyCallback;
    // The then() callback was registered — call it
    const thenCallback = mockApp.whenReady().then;
});

describe('Electron Main Process', () => {
    describe('App initialization', () => {
        test('should append command line switches for performance', () => {
            expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith(
                'disable-features', 'MediaSessionService'
            );
            expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith(
                'js-flags', '--max-old-space-size=512'
            );
        });

        test('should register window-all-closed handler', () => {
            const calls = mockApp.on.mock.calls;
            const windowClosedCall = calls.find(c => c[0] === 'window-all-closed');
            expect(windowClosedCall).toBeDefined();
        });
    });

    describe('IPC Handlers Registration', () => {
        test('should register dialog:openDirectory handler', () => {
            expect(ipcHandlers['dialog:openDirectory']).toBeDefined();
        });

        test('should register dialog:openImage handler', () => {
            expect(ipcHandlers['dialog:openImage']).toBeDefined();
        });

        test('should register dialog:openFile handler', () => {
            expect(ipcHandlers['dialog:openFile']).toBeDefined();
        });

        test('should register fs:fileExists handler', () => {
            expect(ipcHandlers['fs:fileExists']).toBeDefined();
        });

        test('should register fs:getDefaultDirs handler', () => {
            expect(ipcHandlers['fs:getDefaultDirs']).toBeDefined();
        });

        test('should register fs:scanDirectories handler', () => {
            expect(ipcHandlers['fs:scanDirectories']).toBeDefined();
        });

        test('should register fs:parseMetadata handler', () => {
            expect(ipcHandlers['fs:parseMetadata']).toBeDefined();
        });

        test('should register fs:rename handler', () => {
            expect(ipcHandlers['fs:rename']).toBeDefined();
        });

        test('should register fs:delete handler', () => {
            expect(ipcHandlers['fs:delete']).toBeDefined();
        });

        test('should register fs:reveal handler', () => {
            expect(ipcHandlers['fs:reveal']).toBeDefined();
        });

        test('should register all store handlers', () => {
            expect(ipcHandlers['store:get']).toBeDefined();
            expect(ipcHandlers['store:set']).toBeDefined();
            expect(ipcHandlers['store:delete']).toBeDefined();
            expect(ipcHandlers['store:clear']).toBeDefined();
        });

        test('should register all update handlers', () => {
            expect(ipcHandlers['update:check']).toBeDefined();
            expect(ipcHandlers['update:download']).toBeDefined();
            expect(ipcHandlers['update:install']).toBeDefined();
        });
    });

    describe('dialog:openDirectory handler', () => {
        test('should return empty array when dialog is canceled', async () => {
            mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
            const result = await ipcHandlers['dialog:openDirectory']();
            expect(result).toEqual([]);
        });

        test('should return selected paths when dialog is confirmed', async () => {
            const paths = ['/home/user/Music', '/home/user/Downloads'];
            mockDialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: paths });
            const result = await ipcHandlers['dialog:openDirectory']();
            expect(result).toEqual(paths);
        });
    });

    describe('dialog:openImage handler', () => {
        test('should return null when dialog is canceled', async () => {
            mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
            const result = await ipcHandlers['dialog:openImage']();
            expect(result).toBeNull();
        });

        test('should return a single file path when image is selected', async () => {
            mockDialog.showOpenDialog.mockResolvedValue({
                canceled: false,
                filePaths: ['/home/user/photo.jpg'],
            });
            const result = await ipcHandlers['dialog:openImage']();
            expect(result).toBe('/home/user/photo.jpg');
        });
    });

    describe('fs:getDefaultDirs handler', () => {
        test('should return music and downloads directories', () => {
            const result = ipcHandlers['fs:getDefaultDirs']();
            expect(result).toEqual(['/home/user/Music', '/home/user/Downloads']);
        });
    });

    describe('fs:scanDirectories handler', () => {
        test('should scan provided directories and return deduplicated files', async () => {
            const scanner = require('../../utils/scanner');
            scanner.scanDirectory.mockResolvedValue(['/music/song1.mp3']);

            const result = await ipcHandlers['fs:scanDirectories'](null, ['/dir1', '/dir2']);
            expect(scanner.scanDirectory).toHaveBeenCalledWith('/dir1');
            expect(scanner.scanDirectory).toHaveBeenCalledWith('/dir2');
            expect(Array.isArray(result)).toBe(true);
        });

        test('should handle scan errors gracefully', async () => {
            const scanner = require('../../utils/scanner');
            scanner.scanDirectory.mockRejectedValueOnce(new Error('Permission denied'));
            scanner.scanDirectory.mockResolvedValueOnce(['/music/good.mp3']);

            const result = await ipcHandlers['fs:scanDirectories'](null, ['/bad_dir', '/good_dir']);
            expect(result).toContain('/music/good.mp3');
        });
    });

    describe('fs:parseMetadata handler', () => {
        test('should return parsed metadata', async () => {
            const result = await ipcHandlers['fs:parseMetadata'](null, '/music/song1.mp3');
            expect(result).toHaveProperty('title', 'Test Song');
            expect(result).toHaveProperty('artist', 'Test Artist');
        });

        test('should return fallback metadata on parse error', async () => {
            const metadata = require('../../utils/metadata');
            metadata.parse.mockRejectedValueOnce(new Error('parse error'));

            const result = await ipcHandlers['fs:parseMetadata'](null, '/music/bad.mp3');
            expect(result).toHaveProperty('title');
            expect(result).toHaveProperty('artist', 'Unknown Artist');
            expect(result).toHaveProperty('album', 'Unknown Album');
            expect(result).toHaveProperty('path', '/music/bad.mp3');
        });
    });

    describe('store handlers', () => {
        test('store:get should call store.get', () => {
            ipcHandlers['store:get'](null, 'favorites');
            expect(mockStore.get).toHaveBeenCalledWith('favorites');
        });

        test('store:set should call store.set', () => {
            ipcHandlers['store:set'](null, 'favorites', ['song1']);
            expect(mockStore.set).toHaveBeenCalledWith('favorites', ['song1']);
        });

        test('store:delete should call store.delete', () => {
            ipcHandlers['store:delete'](null, 'favorites');
            expect(mockStore.delete).toHaveBeenCalledWith('favorites');
        });

        test('store:clear should call store.clear', () => {
            ipcHandlers['store:clear']();
            expect(mockStore.clear).toHaveBeenCalled();
        });
    });

    describe('fs:reveal handler', () => {
        test('should call shell.showItemInFolder', async () => {
            await ipcHandlers['fs:reveal'](null, '/music/song.mp3');
            expect(mockShell.showItemInFolder).toHaveBeenCalledWith('/music/song.mp3');
        });
    });

    describe('fs:delete handler', () => {
        test('should return success when file is trashed', async () => {
            mockShell.trashItem.mockResolvedValue(undefined);
            const result = await ipcHandlers['fs:delete'](null, '/music/song.mp3');
            expect(result).toEqual({ success: true });
        });

        test('should return error when trash fails', async () => {
            mockShell.trashItem.mockRejectedValue(new Error('Cannot trash'));
            const result = await ipcHandlers['fs:delete'](null, '/music/song.mp3');
            expect(result).toEqual({ success: false, error: 'Cannot trash' });
        });
    });

    describe('update handlers in dev mode', () => {
        test('update:check should return error in dev mode', async () => {
            const result = await ipcHandlers['update:check']();
            expect(result).toHaveProperty('error');
            expect(result.error).toMatch(/not available/i);
        });

        test('update:download should return error in dev mode', async () => {
            const result = await ipcHandlers['update:download']();
            expect(result).toHaveProperty('error');
        });

        test('update:install should return error in dev mode', () => {
            const result = ipcHandlers['update:install']();
            expect(result).toHaveProperty('error');
        });
    });
});
