/**
 * Test Suite: metadata.js — Metadata Parser
 * Tests the music-metadata parsing utility
 */

const path = require('node:path');
const metadataParser = require('../../utils/metadata');

describe('metadata.parse', () => {
    // We can only fully test with real audio files. These tests verify the
    // shape and fallback behaviour of the return value using a non-existent
    // or minimal file.

    test('should throw/reject for a non-existent file', async () => {
        await expect(metadataParser.parse('/tmp/does-not-exist.mp3'))
            .rejects.toThrow();
    });

    test('should export a parse function', () => {
        expect(typeof metadataParser.parse).toBe('function');
    });

    test('parse should return a promise', () => {
        const result = metadataParser.parse('/tmp/does-not-exist.mp3');
        expect(result).toBeInstanceOf(Promise);
        // swallow the rejection
        result.catch(() => { });
    });
});

describe('metadata output shape (integration)', () => {
    // This test uses a real (tiny, silent) mp3 if available. Skip if not.
    const fixturePath = path.join(__dirname, '__test_fixtures__', 'silence.mp3');
    const fs = require('node:fs');
    const fixtureExists = fs.existsSync(fixturePath);

    const conditionalTest = fixtureExists ? test : test.skip;

    conditionalTest('should return expected metadata fields', async () => {
        const meta = await metadataParser.parse(fixturePath);
        expect(meta).toHaveProperty('title');
        expect(meta).toHaveProperty('artist');
        expect(meta).toHaveProperty('album');
        expect(meta).toHaveProperty('genre');
        expect(meta).toHaveProperty('duration');
        expect(meta).toHaveProperty('picture');
        expect(meta).toHaveProperty('path');
        expect(Array.isArray(meta.genre)).toBe(true);
        expect(typeof meta.duration).toBe('number');
        expect(meta.path).toBe(fixturePath);
    });
});
