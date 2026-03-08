// ============================================================
// LUMORA MUSIC PLAYER — state.js
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

    // ---- Multi-select state (in-memory only, never persisted) ----
    selectedItems: new Set(),     // Set of file paths currently selected
    selectionMode: false,         // whether selection mode is active
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

// ===================== Play History / Weekly Report =====================

/**
 * Record a song play event.
 * Each entry: { path, title, artist, genre, duration, timestamp }
 */
export async function recordPlay(song) {
    const history = await getStoreData('play-history', []);
    history.push({
        path: song.path,
        title: song.title || 'Unknown',
        artist: song.artist || 'Unknown Artist',
        genre: song.genre || 'Unknown',
        duration: song.duration || 0,
        timestamp: Date.now()
    });

    // Keep max 6 months of history (~26 weeks) to avoid unbounded growth
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    const trimmed = history.filter(e => e.timestamp >= sixMonthsAgo);

    await window.electronAPI.store.set('play-history', trimmed);
}

export async function getPlayHistory() {
    return await getStoreData('play-history', []);
}

export async function getLastReportDate() {
    return await getStoreData('last-report-date', 0);
}

export async function saveLastReportDate(timestamp) {
    await window.electronAPI.store.set('last-report-date', timestamp);
}
