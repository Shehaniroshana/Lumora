// ============================================================
// SOUNDSTORM MUSIC PLAYER — state.js
// Stores all global application state
// ============================================================

export const state = {
    playlist: [], // full library (array of metadata objects)
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'none',   // 'none' | 'all' | 'one'
    isMuted: false,

    favorites: JSON.parse(localStorage.getItem('soundstorm-favorites') || '[]'),
    playlists: JSON.parse(localStorage.getItem('soundstorm-playlists') || '[]'),
    scannedFolders: JSON.parse(localStorage.getItem('soundstorm-folders') || '[]'),
    currentWallpaperUri: null,

    currentView: 'library',
    activePlaylistId: null,      // ID of the playlist currently being viewed
    contextTargetIndex: -1,      // song index for right-click context menu
    contextTargetPlaylistId: null, // playlist ID for context menu

    playQueueContext: []         // array of global indices representing the current playback queue
};

// ===================== Persistence Helpers =====================
export function saveFavorites() {
    localStorage.setItem('soundstorm-favorites', JSON.stringify(state.favorites));
}

export function savePlaylists() {
    localStorage.setItem('soundstorm-playlists', JSON.stringify(state.playlists));
}

export function saveFolders() {
    localStorage.setItem('soundstorm-folders', JSON.stringify(state.scannedFolders));
}
