/**
 * Test Suite: Playlist Management Logic
 * Tests playlist CRUD operations and song management within playlists
 */

describe('Playlist Management', () => {
    let playlists;

    beforeEach(() => {
        playlists = [];
    });

    function createPlaylist(name) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const playlist = { id, name, songs: [] };
        playlists.push(playlist);
        return playlist;
    }

    function deletePlaylist(id) {
        playlists = playlists.filter(p => p.id !== id);
    }

    function renamePlaylist(id, newName) {
        const pl = playlists.find(p => p.id === id);
        if (pl) pl.name = newName;
    }

    function addSongToPlaylist(playlistId, songPath) {
        const pl = playlists.find(p => p.id === playlistId);
        if (pl && !pl.songs.includes(songPath)) {
            pl.songs.push(songPath);
        }
    }

    function removeSongFromPlaylist(playlistId, songPath) {
        const pl = playlists.find(p => p.id === playlistId);
        if (pl) {
            pl.songs = pl.songs.filter(s => s !== songPath);
        }
    }

    describe('Create playlist', () => {
        test('should create a playlist with a name', () => {
            const pl = createPlaylist('My Mix');
            expect(pl.name).toBe('My Mix');
            expect(pl.songs).toEqual([]);
            expect(pl.id).toBeTruthy();
        });

        test('should add playlist to the list', () => {
            createPlaylist('Playlist 1');
            createPlaylist('Playlist 2');
            expect(playlists).toHaveLength(2);
        });

        test('each playlist should have a unique id', () => {
            const p1 = createPlaylist('A');
            const p2 = createPlaylist('B');
            expect(p1.id).not.toBe(p2.id);
        });
    });

    describe('Delete playlist', () => {
        test('should remove a playlist by id', () => {
            const pl = createPlaylist('To Delete');
            expect(playlists).toHaveLength(1);
            deletePlaylist(pl.id);
            expect(playlists).toHaveLength(0);
        });

        test('should not affect other playlists', () => {
            const p1 = createPlaylist('Keep');
            const p2 = createPlaylist('Remove');
            deletePlaylist(p2.id);
            expect(playlists).toHaveLength(1);
            expect(playlists[0].name).toBe('Keep');
        });

        test('should do nothing for non-existent id', () => {
            createPlaylist('Exists');
            deletePlaylist('nonexistent');
            expect(playlists).toHaveLength(1);
        });
    });

    describe('Rename playlist', () => {
        test('should update the playlist name', () => {
            const pl = createPlaylist('Old Name');
            renamePlaylist(pl.id, 'New Name');
            expect(playlists[0].name).toBe('New Name');
        });

        test('should not throw for non-existent id', () => {
            expect(() => renamePlaylist('fake', 'Name')).not.toThrow();
        });
    });

    describe('Add song to playlist', () => {
        test('should add a song to the playlist', () => {
            const pl = createPlaylist('My Mix');
            addSongToPlaylist(pl.id, '/song1.mp3');
            expect(playlists[0].songs).toEqual(['/song1.mp3']);
        });

        test('should not add duplicate songs', () => {
            const pl = createPlaylist('My Mix');
            addSongToPlaylist(pl.id, '/song1.mp3');
            addSongToPlaylist(pl.id, '/song1.mp3');
            expect(playlists[0].songs).toHaveLength(1);
        });

        test('should add multiple different songs', () => {
            const pl = createPlaylist('My Mix');
            addSongToPlaylist(pl.id, '/song1.mp3');
            addSongToPlaylist(pl.id, '/song2.mp3');
            addSongToPlaylist(pl.id, '/song3.mp3');
            expect(playlists[0].songs).toHaveLength(3);
        });
    });

    describe('Remove song from playlist', () => {
        test('should remove a song from the playlist', () => {
            const pl = createPlaylist('My Mix');
            addSongToPlaylist(pl.id, '/song1.mp3');
            addSongToPlaylist(pl.id, '/song2.mp3');
            removeSongFromPlaylist(pl.id, '/song1.mp3');
            expect(playlists[0].songs).toEqual(['/song2.mp3']);
        });

        test('should do nothing if song not in playlist', () => {
            const pl = createPlaylist('My Mix');
            addSongToPlaylist(pl.id, '/song1.mp3');
            removeSongFromPlaylist(pl.id, '/other.mp3');
            expect(playlists[0].songs).toHaveLength(1);
        });
    });
});

describe('Favorites Management', () => {
    let favorites;

    beforeEach(() => {
        favorites = [];
    });

    function toggleFavorite(path) {
        const idx = favorites.indexOf(path);
        if (idx >= 0) {
            favorites.splice(idx, 1);
            return false; // removed
        }
        favorites.push(path);
        return true; // added
    }

    function isFavorite(path) {
        return favorites.includes(path);
    }

    test('should add a song to favorites', () => {
        const added = toggleFavorite('/song1.mp3');
        expect(added).toBe(true);
        expect(favorites).toContain('/song1.mp3');
    });

    test('should remove a song from favorites on second toggle', () => {
        toggleFavorite('/song1.mp3');
        const removed = toggleFavorite('/song1.mp3');
        expect(removed).toBe(false);
        expect(favorites).not.toContain('/song1.mp3');
    });

    test('isFavorite should return true for favorited songs', () => {
        toggleFavorite('/song1.mp3');
        expect(isFavorite('/song1.mp3')).toBe(true);
        expect(isFavorite('/other.mp3')).toBe(false);
    });

    test('should handle multiple favorites', () => {
        toggleFavorite('/a.mp3');
        toggleFavorite('/b.mp3');
        toggleFavorite('/c.mp3');
        expect(favorites).toHaveLength(3);

        toggleFavorite('/b.mp3');
        expect(favorites).toHaveLength(2);
        expect(isFavorite('/b.mp3')).toBe(false);
    });
});
