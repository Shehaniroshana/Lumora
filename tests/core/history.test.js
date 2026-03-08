/**
 * Test Suite: Play History & Weekly Report Logic
 * Tests play history recording, trimming, and weekly report generation
 */

describe('Play History', () => {
    let history;

    beforeEach(() => {
        history = [];
    });

    function recordPlay(song) {
        history.push({
            path: song.path,
            title: song.title || 'Unknown',
            artist: song.artist || 'Unknown Artist',
            genre: song.genre || 'Unknown',
            duration: song.duration || 0,
            timestamp: Date.now(),
        });
    }

    function trimHistory(maxAge = 180 * 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - maxAge;
        history = history.filter(e => e.timestamp >= cutoff);
    }

    test('should record a play event', () => {
        recordPlay({ path: '/s.mp3', title: 'Song', artist: 'Artist', genre: 'Rock', duration: 200 });
        expect(history).toHaveLength(1);
        expect(history[0].title).toBe('Song');
    });

    test('should use fallback values for missing fields', () => {
        recordPlay({ path: '/s.mp3' });
        expect(history[0].title).toBe('Unknown');
        expect(history[0].artist).toBe('Unknown Artist');
        expect(history[0].genre).toBe('Unknown');
        expect(history[0].duration).toBe(0);
    });

    test('should include timestamp', () => {
        const before = Date.now();
        recordPlay({ path: '/s.mp3' });
        const after = Date.now();
        expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    test('should accumulate multiple plays', () => {
        recordPlay({ path: '/a.mp3', title: 'A' });
        recordPlay({ path: '/b.mp3', title: 'B' });
        recordPlay({ path: '/a.mp3', title: 'A' });
        expect(history).toHaveLength(3);
    });

    test('trim should remove entries older than cutoff', () => {
        // Add an "old" entry
        history.push({
            path: '/old.mp3',
            title: 'Old',
            artist: 'Old',
            genre: 'Old',
            duration: 100,
            timestamp: Date.now() - 200 * 24 * 60 * 60 * 1000, // 200 days ago
        });
        recordPlay({ path: '/new.mp3', title: 'New' });

        trimHistory();
        expect(history).toHaveLength(1);
        expect(history[0].title).toBe('New');
    });

    test('trim should keep all recent entries', () => {
        recordPlay({ path: '/a.mp3', title: 'A' });
        recordPlay({ path: '/b.mp3', title: 'B' });
        trimHistory();
        expect(history).toHaveLength(2);
    });
});

describe('Weekly Report Generation', () => {
    function generateReport(history, startDate, endDate) {
        const filtered = history.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);

        const totalPlays = filtered.length;
        const totalTime = filtered.reduce((sum, e) => sum + (e.duration || 0), 0);
        const uniqueSongs = new Set(filtered.map(e => e.path)).size;
        const uniqueArtists = new Set(filtered.map(e => e.artist)).size;

        // Top songs by play count
        const songCounts = {};
        filtered.forEach(e => {
            songCounts[e.path] = (songCounts[e.path] || 0) + 1;
        });
        const topSongs = Object.entries(songCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([path, count]) => ({ path, count }));

        // Top artists by play count
        const artistCounts = {};
        filtered.forEach(e => {
            artistCounts[e.artist] = (artistCounts[e.artist] || 0) + 1;
        });
        const topArtists = Object.entries(artistCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([artist, count]) => ({ artist, count }));

        return { totalPlays, totalTime, uniqueSongs, uniqueArtists, topSongs, topArtists };
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const sampleHistory = [
        { path: '/a.mp3', title: 'A', artist: 'Artist1', genre: 'Rock', duration: 200, timestamp: now - DAY },
        { path: '/b.mp3', title: 'B', artist: 'Artist2', genre: 'Pop', duration: 180, timestamp: now - DAY },
        { path: '/a.mp3', title: 'A', artist: 'Artist1', genre: 'Rock', duration: 200, timestamp: now - 2 * DAY },
        { path: '/c.mp3', title: 'C', artist: 'Artist1', genre: 'Jazz', duration: 300, timestamp: now - 3 * DAY },
        { path: '/a.mp3', title: 'A', artist: 'Artist1', genre: 'Rock', duration: 200, timestamp: now - 4 * DAY },
    ];

    test('should calculate total plays', () => {
        const report = generateReport(sampleHistory, now - 7 * DAY, now);
        expect(report.totalPlays).toBe(5);
    });

    test('should calculate total listening time', () => {
        const report = generateReport(sampleHistory, now - 7 * DAY, now);
        expect(report.totalTime).toBe(200 + 180 + 200 + 300 + 200);
    });

    test('should count unique songs', () => {
        const report = generateReport(sampleHistory, now - 7 * DAY, now);
        expect(report.uniqueSongs).toBe(3); // a, b, c
    });

    test('should count unique artists', () => {
        const report = generateReport(sampleHistory, now - 7 * DAY, now);
        expect(report.uniqueArtists).toBe(2); // Artist1, Artist2
    });

    test('should rank top songs by play count', () => {
        const report = generateReport(sampleHistory, now - 7 * DAY, now);
        expect(report.topSongs[0].path).toBe('/a.mp3');
        expect(report.topSongs[0].count).toBe(3);
    });

    test('should rank top artists by play count', () => {
        const report = generateReport(sampleHistory, now - 7 * DAY, now);
        expect(report.topArtists[0].artist).toBe('Artist1');
        expect(report.topArtists[0].count).toBe(4);
    });

    test('should return empty report for no matching history', () => {
        const report = generateReport(sampleHistory, now - 30 * DAY, now - 20 * DAY);
        expect(report.totalPlays).toBe(0);
        expect(report.uniqueSongs).toBe(0);
    });

    test('should limit top songs to 5', () => {
        const manyHistory = Array.from({ length: 20 }, (_, i) => ({
            path: `/song${i}.mp3`, title: `Song ${i}`, artist: 'X', genre: 'Y', duration: 100, timestamp: now - DAY,
        }));
        const report = generateReport(manyHistory, now - 7 * DAY, now);
        expect(report.topSongs.length).toBeLessThanOrEqual(5);
    });
});
