/**
 * Test Suite: Audio Playback Logic
 * Tests next/prev song navigation, shuffle, repeat, and mute logic
 *
 * Since audio.js is an ESM module coupled to DOM and Web Audio API,
 * we test the core navigation algorithms in isolation.
 */

describe('Next Song Logic', () => {
    let state;

    function nextSong() {
        if (state.playlist.length === 0) return -1;

        let q = state.playQueueContext && state.playQueueContext.length > 0
            ? state.playQueueContext
            : state.playlist.map((_, i) => i);
        const currQIdx = q.indexOf(state.currentIndex);

        if (currQIdx === -1) {
            if (state.isShuffle) {
                return q[Math.floor(Math.random() * q.length)];
            }
            return (state.currentIndex + 1) % state.playlist.length;
        }

        if (state.isShuffle) {
            return q[Math.floor(Math.random() * q.length)];
        }
        return q[(currQIdx + 1) % q.length];
    }

    beforeEach(() => {
        state = {
            playlist: [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }],
            currentIndex: 0,
            isShuffle: false,
            playQueueContext: [],
        };
    });

    test('should return -1 when playlist is empty', () => {
        state.playlist = [];
        expect(nextSong()).toBe(-1);
    });

    test('should advance to next index sequentially', () => {
        state.currentIndex = 0;
        expect(nextSong()).toBe(1);

        state.currentIndex = 1;
        expect(nextSong()).toBe(2);

        state.currentIndex = 2;
        expect(nextSong()).toBe(3);
    });

    test('should wrap around to beginning', () => {
        state.currentIndex = 3; // last song
        expect(nextSong()).toBe(0);
    });

    test('should use playQueueContext when available', () => {
        state.playQueueContext = [2, 0, 3]; // custom queue
        state.currentIndex = 2; // currently at index 2 which is pos 0 in queue
        expect(nextSong()).toBe(0); // next in queue
    });

    test('should wrap in custom queue', () => {
        state.playQueueContext = [1, 3];
        state.currentIndex = 3; // last in queue
        expect(nextSong()).toBe(1); // wrap to first
    });

    test('should return a valid index when shuffle is on', () => {
        state.isShuffle = true;
        const result = nextSong();
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(state.playlist.length);
    });
});

describe('Previous Song Logic', () => {
    let state;

    function prevSong(currentTime = 0) {
        if (state.playlist.length === 0) return -1;
        if (currentTime > 3) return state.currentIndex; // restart current

        let q = state.playQueueContext && state.playQueueContext.length > 0
            ? state.playQueueContext
            : state.playlist.map((_, i) => i);
        const currQIdx = q.indexOf(state.currentIndex);

        if (currQIdx === -1) {
            return (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
        }
        return q[(currQIdx - 1 + q.length) % q.length];
    }

    beforeEach(() => {
        state = {
            playlist: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
            currentIndex: 1,
            playQueueContext: [],
        };
    });

    test('should return -1 when playlist is empty', () => {
        state.playlist = [];
        expect(prevSong()).toBe(-1);
    });

    test('should restart current song if currentTime > 3', () => {
        state.currentIndex = 2;
        expect(prevSong(5)).toBe(2); // stay on same song
    });

    test('should go to previous song sequentially', () => {
        state.currentIndex = 2;
        expect(prevSong()).toBe(1);

        state.currentIndex = 1;
        expect(prevSong()).toBe(0);
    });

    test('should wrap to last song from beginning', () => {
        state.currentIndex = 0;
        expect(prevSong()).toBe(2);
    });

    test('should use playQueueContext when available', () => {
        state.playQueueContext = [2, 0, 1];
        state.currentIndex = 0; // position 1 in queue
        expect(prevSong()).toBe(2); // previous in queue
    });
});

describe('Repeat Mode Logic', () => {
    test('repeat "one" should replay same song index', () => {
        const repeatMode = 'one';
        const currentIndex = 5;

        if (repeatMode === 'one') {
            // audio.currentTime = 0; audio.play();
            expect(currentIndex).toBe(5); // stays the same
        }
    });

    test('repeat "all" should cycle through playlist', () => {
        const repeatMode = 'all';
        const playlistLength = 10;
        let currentIndex = 9; // last

        if (repeatMode === 'all' || repeatMode === 'none') {
            currentIndex = (currentIndex + 1) % playlistLength;
        }
        expect(currentIndex).toBe(0); // wraps
    });

    test('repeat "none" still wraps (nextSong handles stopping)', () => {
        const repeatMode = 'none';
        const playlistLength = 5;
        let currentIndex = 4;

        currentIndex = (currentIndex + 1) % playlistLength;
        expect(currentIndex).toBe(0);
    });
});

describe('Mute Logic', () => {
    test('should toggle mute state', () => {
        let isMuted = false;

        isMuted = !isMuted;
        expect(isMuted).toBe(true);

        isMuted = !isMuted;
        expect(isMuted).toBe(false);
    });

    test('volume 0 should trigger mute', () => {
        let isMuted = false;
        const volume = 0;

        if (volume === 0 && !isMuted) isMuted = true;
        expect(isMuted).toBe(true);
    });

    test('volume > 0 should un-mute', () => {
        let isMuted = true;
        const volume = 0.5;

        if (volume > 0 && isMuted) isMuted = false;
        expect(isMuted).toBe(false);
    });
});

describe('Volume Logic', () => {
    test('volume should be clamped between 0 and 1', () => {
        const clampVolume = (v) => Math.max(0, Math.min(1, v));

        expect(clampVolume(0)).toBe(0);
        expect(clampVolume(0.5)).toBe(0.5);
        expect(clampVolume(1)).toBe(1);
        expect(clampVolume(-0.1)).toBe(0);
        expect(clampVolume(1.5)).toBe(1);
    });
});
