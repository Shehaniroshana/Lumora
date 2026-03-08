/**
 * Test Suite: scanner.js — Directory Scanner
 * Tests the recursive file scanning utility
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { scanDirectory } = require('../../utils/scanner');

// Create a temporary directory structure for testing
const TEST_DIR = path.join(__dirname, '__test_fixtures__');

beforeAll(async () => {
    // Build a temp directory tree with various files
    await fs.mkdir(path.join(TEST_DIR, 'music', 'rock'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'music', 'jazz'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'videos'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'node_modules', 'pkg'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, '.git'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIR, 'empty_folder'), { recursive: true });

    // Create audio files
    await fs.writeFile(path.join(TEST_DIR, 'music', 'song1.mp3'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'song2.ogg'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'rock', 'rock_anthem.flac'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'jazz', 'smooth.aac'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'jazz', 'bossa.wav'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'jazz', 'cool.m4a'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'track.opus'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'legacy.wma'), '');

    // Create video files
    await fs.writeFile(path.join(TEST_DIR, 'videos', 'clip.mp4'), '');
    await fs.writeFile(path.join(TEST_DIR, 'videos', 'recording.webm'), '');
    await fs.writeFile(path.join(TEST_DIR, 'videos', 'movie.mkv'), '');
    await fs.writeFile(path.join(TEST_DIR, 'videos', 'home.mov'), '');
    await fs.writeFile(path.join(TEST_DIR, 'videos', 'old.avi'), '');

    // Create non-media files (should be ignored)
    await fs.writeFile(path.join(TEST_DIR, 'readme.txt'), 'hello');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'cover.jpg'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'playlist.m3u'), '');
    await fs.writeFile(path.join(TEST_DIR, 'music', 'notes.pdf'), '');

    // Files in ignored directories (should NOT appear in results)
    await fs.writeFile(path.join(TEST_DIR, 'node_modules', 'pkg', 'test.mp3'), '');
    await fs.writeFile(path.join(TEST_DIR, '.git', 'hook.mp3'), '');
});

afterAll(async () => {
    // Clean up test fixtures
    await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('scanDirectory', () => {
    test('should find all supported audio files recursively', async () => {
        const results = await scanDirectory(TEST_DIR);
        const basenames = results.map(f => path.basename(f));

        expect(basenames).toContain('song1.mp3');
        expect(basenames).toContain('song2.ogg');
        expect(basenames).toContain('rock_anthem.flac');
        expect(basenames).toContain('smooth.aac');
        expect(basenames).toContain('bossa.wav');
        expect(basenames).toContain('cool.m4a');
        expect(basenames).toContain('track.opus');
        expect(basenames).toContain('legacy.wma');
    });

    test('should find all supported video files', async () => {
        const results = await scanDirectory(TEST_DIR);
        const basenames = results.map(f => path.basename(f));

        expect(basenames).toContain('clip.mp4');
        expect(basenames).toContain('recording.webm');
        expect(basenames).toContain('movie.mkv');
        expect(basenames).toContain('home.mov');
        expect(basenames).toContain('old.avi');
    });

    test('should NOT include non-media files', async () => {
        const results = await scanDirectory(TEST_DIR);
        const basenames = results.map(f => path.basename(f));

        expect(basenames).not.toContain('readme.txt');
        expect(basenames).not.toContain('cover.jpg');
        expect(basenames).not.toContain('playlist.m3u');
        expect(basenames).not.toContain('notes.pdf');
    });

    test('should skip node_modules directory', async () => {
        const results = await scanDirectory(TEST_DIR);
        const inNodeModules = results.filter(f => f.includes('node_modules'));
        expect(inNodeModules).toHaveLength(0);
    });

    test('should skip .git directory', async () => {
        const results = await scanDirectory(TEST_DIR);
        const inGit = results.filter(f => f.includes('.git'));
        expect(inGit).toHaveLength(0);
    });

    test('should return absolute file paths', async () => {
        const results = await scanDirectory(TEST_DIR);
        results.forEach(filePath => {
            expect(path.isAbsolute(filePath)).toBe(true);
        });
    });

    test('should return an empty array for an empty directory', async () => {
        const results = await scanDirectory(path.join(TEST_DIR, 'empty_folder'));
        expect(results).toEqual([]);
    });

    test('should handle non-existent directory gracefully', async () => {
        const results = await scanDirectory('/non/existent/path/12345');
        expect(results).toEqual([]);
    });

    test('should return the correct total number of media files', async () => {
        const results = await scanDirectory(TEST_DIR);
        // 8 audio + 5 video = 13 media files
        expect(results).toHaveLength(13);
    });

    test('should be case-insensitive for file extensions', async () => {
        // Create files with uppercase extensions
        await fs.writeFile(path.join(TEST_DIR, 'music', 'LOUD.MP3'), '');
        await fs.writeFile(path.join(TEST_DIR, 'videos', 'CLIP.MP4'), '');

        const results = await scanDirectory(TEST_DIR);
        const basenames = results.map(f => path.basename(f));

        expect(basenames).toContain('LOUD.MP3');
        expect(basenames).toContain('CLIP.MP4');

        // Clean up
        await fs.unlink(path.join(TEST_DIR, 'music', 'LOUD.MP3'));
        await fs.unlink(path.join(TEST_DIR, 'videos', 'CLIP.MP4'));
    });
});
