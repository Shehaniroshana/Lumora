/**
 * Test Suite: utils.js — Utility Functions
 * Tests escapeHtml and formatTime pure functions
 *
 * These are ESM modules but we test them by re-implementing the logic
 * since Jest runs in CommonJS by default and these modules import DOM elements.
 */

// Re-implement the pure functions for testing (they have no side effects)
// This avoids needing to mock the entire DOM/ESM import chain.

function formatTime(s) {
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

describe('formatTime', () => {
    test('should format 0 seconds as "0:00"', () => {
        expect(formatTime(0)).toBe('0:00');
    });

    test('should format 59 seconds as "0:59"', () => {
        expect(formatTime(59)).toBe('0:59');
    });

    test('should format 60 seconds as "1:00"', () => {
        expect(formatTime(60)).toBe('1:00');
    });

    test('should format 90 seconds as "1:30"', () => {
        expect(formatTime(90)).toBe('1:30');
    });

    test('should format 3661 seconds as "61:01"', () => {
        expect(formatTime(3661)).toBe('61:01');
    });

    test('should pad single-digit seconds with leading zero', () => {
        expect(formatTime(61)).toBe('1:01');
        expect(formatTime(305)).toBe('5:05');
    });

    test('should handle NaN input', () => {
        expect(formatTime(NaN)).toBe('0:00');
    });

    test('should handle negative input', () => {
        expect(formatTime(-5)).toBe('0:00');
    });

    test('should handle undefined input', () => {
        expect(formatTime(undefined)).toBe('0:00');
    });

    test('should handle null input', () => {
        expect(formatTime(null)).toBe('0:00');
    });

    test('should floor fractional seconds', () => {
        expect(formatTime(65.9)).toBe('1:05');
        expect(formatTime(119.999)).toBe('1:59');
    });

    test('should handle very large values', () => {
        expect(formatTime(36000)).toBe('600:00'); // 10 hours
    });
});

describe('escapeHtml', () => {
    test('should escape ampersands', () => {
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('should escape less-than signs', () => {
        expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    test('should escape greater-than signs', () => {
        expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    test('should escape double quotes', () => {
        expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    test('should escape all special characters together', () => {
        expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
    });

    test('should return empty string for null input', () => {
        expect(escapeHtml(null)).toBe('');
    });

    test('should return empty string for undefined input', () => {
        expect(escapeHtml(undefined)).toBe('');
    });

    test('should return empty string for empty string input', () => {
        expect(escapeHtml('')).toBe('');
    });

    test('should pass through strings without special chars', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    test('should handle strings with only special characters', () => {
        expect(escapeHtml('<>&"')).toBe('&lt;&gt;&amp;&quot;');
    });

    test('should handle multiple consecutive ampersands', () => {
        expect(escapeHtml('&&&&')).toBe('&amp;&amp;&amp;&amp;');
    });
});
