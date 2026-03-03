// ============================================================
// SOUNDSTORM MUSIC PLAYER — state.js
// Stores all global application state
// ============================================================

// Helper to get data from electron-store with fallback
async function getStoreData(key, defaultValue) {
    try {
        const value = await window.electronAPI.store.get(key);
        return value !== undefined ? value : defaultValue;
    } catch (error) {
        console.error(`Error reading store key ${key}:`, error);
        return defaultValue;
    }
}

// Initialize state - will be populated async on load
export const state = {
    playlist: [], // full library (array of metadata objects)
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'none',   // 'none' | 'all' | 'one'
    isMuted: false,

    favorites: [],
    playlists: [],
    scannedFolders: [],
    currentWallpaperUri: null,

    currentView: 'library',
    activePlaylistId: null,      // ID of the playlist currently being viewed
    contextTargetIndex: -1,      // song index for right-click context menu
    contextTargetPlaylistId: null, // playlist ID for context menu

    playQueueContext: [],         // array of global indices representing the current playback queue
    videos: [], // detected video files
};

// Load state from electron-store
export async function loadState() {
    state.favorites = await getStoreData('favorites', []);
    state.playlists = await getStoreData('playlists', []);
    state.scannedFolders = await getStoreData('folders', []);
}

// ===================== Persistence Helpers =====================
export async function saveFavorites() {
    await window.electronAPI.store.set('favorites', state.favorites);
}

export async function savePlaylists() {
    await window.electronAPI.store.set('playlists', state.playlists);
}

export async function saveFolders() {
    await window.electronAPI.store.set('folders', state.scannedFolders);
}

export async function saveLastTrack(trackPath) {
    await window.electronAPI.store.set('last-track', trackPath);
}

export async function getLastTrack() {
    return await getStoreData('last-track', null);
}

export async function saveLastTrackTime(time) {
    await window.electronAPI.store.set('last-track-time', time);
}

export async function getLastTrackTime() {
    const time = await getStoreData('last-track-time', 0);
    return typeof time === 'number' ? time : 0;
}
