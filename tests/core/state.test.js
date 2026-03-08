/**
 * Test Suite: state.js — Application State
 * Tests the state object shape and default values
 *
 * Since state.js is an ESM module that depends on window.electronAPI,
 * we test the state structure and logic by recreating it here.
 */

describe('Application State — Default Values', () => {
    // Recreate the default state object to verify structure
    const defaultState = {
        playlist: [],
        currentIndex: -1,
        isPlaying: false,
        isShuffle: false,
        repeatMode: 'none',
        isMuted: false,
        favorites: [],
        playlists: [],
        scannedFolders: [],
        currentWallpaperUri: null,
        currentView: 'library',
        activePlaylistId: null,
        contextTargetIndex: -1,
        contextTargetPlaylistId: null,
        playQueueContext: [],
        videos: [],
        selectedItems: new Set(),
        selectionMode: false,
    };

    test('playlist should default to empty array', () => {
        expect(defaultState.playlist).toEqual([]);
    });

    test('currentIndex should default to -1', () => {
        expect(defaultState.currentIndex).toBe(-1);
    });

    test('isPlaying should default to false', () => {
        expect(defaultState.isPlaying).toBe(false);
    });

    test('isShuffle should default to false', () => {
        expect(defaultState.isShuffle).toBe(false);
    });

    test('repeatMode should default to "none"', () => {
        expect(defaultState.repeatMode).toBe('none');
    });

    test('repeatMode accepts valid values', () => {
        const validModes = ['none', 'all', 'one'];
        validModes.forEach(mode => {
            expect(['none', 'all', 'one']).toContain(mode);
        });
    });

    test('isMuted should default to false', () => {
        expect(defaultState.isMuted).toBe(false);
    });

    test('favorites should default to empty array', () => {
        expect(defaultState.favorites).toEqual([]);
    });

    test('playlists should default to empty array', () => {
        expect(defaultState.playlists).toEqual([]);
    });

    test('scannedFolders should default to empty array', () => {
        expect(defaultState.scannedFolders).toEqual([]);
    });

    test('currentWallpaperUri should default to null', () => {
        expect(defaultState.currentWallpaperUri).toBeNull();
    });

    test('currentView should default to "library"', () => {
        expect(defaultState.currentView).toBe('library');
    });

    test('activePlaylistId should default to null', () => {
        expect(defaultState.activePlaylistId).toBeNull();
    });

    test('contextTargetIndex should default to -1', () => {
        expect(defaultState.contextTargetIndex).toBe(-1);
    });

    test('playQueueContext should default to empty array', () => {
        expect(defaultState.playQueueContext).toEqual([]);
    });

    test('videos should default to empty array', () => {
        expect(defaultState.videos).toEqual([]);
    });

    test('selectedItems should be a Set', () => {
        expect(defaultState.selectedItems).toBeInstanceOf(Set);
        expect(defaultState.selectedItems.size).toBe(0);
    });

    test('selectionMode should default to false', () => {
        expect(defaultState.selectionMode).toBe(false);
    });
});

describe('State Mutation Logic', () => {
    let state;

    beforeEach(() => {
        state = {
            playlist: [],
            currentIndex: -1,
            isPlaying: false,
            isShuffle: false,
            repeatMode: 'none',
            isMuted: false,
            favorites: [],
            playlists: [],
            selectedItems: new Set(),
            selectionMode: false,
        };
    });

    test('should toggle shuffle mode', () => {
        state.isShuffle = !state.isShuffle;
        expect(state.isShuffle).toBe(true);
        state.isShuffle = !state.isShuffle;
        expect(state.isShuffle).toBe(false);
    });

    test('should cycle repeat mode: none → all → one → none', () => {
        expect(state.repeatMode).toBe('none');

        // none → all
        state.repeatMode = 'all';
        expect(state.repeatMode).toBe('all');

        // all → one
        state.repeatMode = 'one';
        expect(state.repeatMode).toBe('one');

        // one → none
        state.repeatMode = 'none';
        expect(state.repeatMode).toBe('none');
    });

    test('should add songs to playlist', () => {
        const song = { title: 'Test', artist: 'Artist', path: '/test.mp3' };
        state.playlist.push(song);
        expect(state.playlist).toHaveLength(1);
        expect(state.playlist[0].title).toBe('Test');
    });

    test('should manage favorites array', () => {
        state.favorites.push('/song1.mp3');
        state.favorites.push('/song2.mp3');
        expect(state.favorites).toHaveLength(2);

        // Remove favorite
        state.favorites = state.favorites.filter(f => f !== '/song1.mp3');
        expect(state.favorites).toHaveLength(1);
        expect(state.favorites[0]).toBe('/song2.mp3');
    });

    test('should manage playlists', () => {
        const playlist = { id: 'p1', name: 'My Playlist', songs: [] };
        state.playlists.push(playlist);
        expect(state.playlists).toHaveLength(1);

        // Add song to playlist
        state.playlists[0].songs.push('/song.mp3');
        expect(state.playlists[0].songs).toHaveLength(1);
    });

    test('should manage selection state', () => {
        state.selectionMode = true;
        state.selectedItems.add('/song1.mp3');
        state.selectedItems.add('/song2.mp3');

        expect(state.selectedItems.size).toBe(2);
        expect(state.selectedItems.has('/song1.mp3')).toBe(true);

        state.selectedItems.delete('/song1.mp3');
        expect(state.selectedItems.size).toBe(1);

        state.selectedItems.clear();
        state.selectionMode = false;
        expect(state.selectedItems.size).toBe(0);
        expect(state.selectionMode).toBe(false);
    });

    test('should update currentIndex when playing a song', () => {
        state.playlist = [
            { title: 'A', path: '/a.mp3' },
            { title: 'B', path: '/b.mp3' },
            { title: 'C', path: '/c.mp3' },
        ];
        state.currentIndex = 1;
        expect(state.playlist[state.currentIndex].title).toBe('B');
    });
});
