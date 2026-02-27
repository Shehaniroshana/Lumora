const fs = require('node:fs/promises');
const path = require('node:path');

/**
 * Recursively scans a directory for .mp3 files.
 * @param {string} dirPath - Directory to scan.
 * @returns {Promise<string[]>} - Array of absolute file paths to .mp3 files.
 */
async function scanDirectory(dirPath) {
    let results = [];
    try {
        const list = await fs.readdir(dirPath, { withFileTypes: true });
        for (const dirent of list) {
            const res = path.resolve(dirPath, dirent.name);
            if (dirent.isDirectory()) {
                // Ignore common large or system folders to speed up scanning
                if (!['node_modules', '.git', 'Library', 'AppData', '.cache', 'tmp'].includes(dirent.name)) {
                    const subResults = await scanDirectory(res);
                    results = results.concat(subResults);
                }
            } else {
                if (dirent.name.toLowerCase().endsWith('.mp3')) {
                    results.push(res);
                }
            }
        }
    } catch (err) {
        // Silently ignore folders without read permissions
        console.warn(`Skipping unreadable directory: ${dirPath}`);
    }
    return results;
}

module.exports = {
    scanDirectory
};
