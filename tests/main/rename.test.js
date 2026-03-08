/**
 * Test Suite: File Rename Safety
 * Tests the filename sanitization logic used in fs:rename handler
 */

const path = require('node:path');

describe('File Rename — Name Sanitization', () => {
    // Mirrors the sanitization in main.js: fs:rename handler
    function sanitizeFileName(name) {
        return name.replace(/[\\/:\*\?"<>\|]/g, '');
    }

    function buildNewPath(oldPath, newName) {
        const dir = path.dirname(oldPath);
        const ext = path.extname(oldPath);
        const safeName = sanitizeFileName(newName);
        return path.join(dir, safeName + ext);
    }

    test('should keep normal names unchanged', () => {
        expect(sanitizeFileName('My Song')).toBe('My Song');
    });

    test('should remove backslashes', () => {
        expect(sanitizeFileName('song\\name')).toBe('songname');
    });

    test('should remove forward slashes', () => {
        expect(sanitizeFileName('song/name')).toBe('songname');
    });

    test('should remove colons', () => {
        expect(sanitizeFileName('song:name')).toBe('songname');
    });

    test('should remove asterisks', () => {
        expect(sanitizeFileName('song*name')).toBe('songname');
    });

    test('should remove question marks', () => {
        expect(sanitizeFileName('song?name')).toBe('songname');
    });

    test('should remove double quotes', () => {
        expect(sanitizeFileName('song"name')).toBe('songname');
    });

    test('should remove angle brackets', () => {
        expect(sanitizeFileName('song<name>')).toBe('songname');
    });

    test('should remove pipe characters', () => {
        expect(sanitizeFileName('song|name')).toBe('songname');
    });

    test('should remove all dangerous characters at once', () => {
        expect(sanitizeFileName('a\\b/c:d*e?f"g<h>i|j')).toBe('abcdefghij');
    });

    test('buildNewPath should preserve extension', () => {
        const result = buildNewPath('/music/old_song.mp3', 'New Song');
        expect(result).toBe('/music/New Song.mp3');
    });

    test('buildNewPath should preserve directory path', () => {
        const result = buildNewPath('/home/user/Music/track.mp3', 'renamed');
        expect(path.dirname(result)).toBe('/home/user/Music');
    });

    test('buildNewPath should sanitize and preserve ext', () => {
        const result = buildNewPath('/music/old.mp3', 'bad<>name');
        expect(result).toBe('/music/badname.mp3');
    });

    test('should handle names with spaces', () => {
        expect(sanitizeFileName('  spaces  ')).toBe('  spaces  ');
    });

    test('should handle names with dots', () => {
        expect(sanitizeFileName('song.v2')).toBe('song.v2');
    });

    test('should handle names with dashes and underscores', () => {
        expect(sanitizeFileName('my-song_v2')).toBe('my-song_v2');
    });

    test('should handle unicode characters', () => {
        expect(sanitizeFileName('canción 日本語')).toBe('canción 日本語');
    });
});
