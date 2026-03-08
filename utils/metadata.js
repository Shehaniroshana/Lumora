const path = require('node:path');

// Dynamically import music-metadata to avoid ERR_REQUIRE_ESM on v8+
const mmPromise = import('music-metadata');

/**
 * Parses ID3 tags and metadata from an MP3 file
 * @param {string} filePath - Absolute path to the MP3 file
 * @returns {Promise<Object>} - Formatted metadata object
 */
async function parse(filePath) {
    try {``
        const mm = await mmPromise;
        const metadata = await mm.parseFile(filePath);

        let pictureBase64 = null;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            pictureBase64 = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
        }

        const fileName = path.basename(filePath);
        const extension = path.extname(filePath).toLowerCase();
        const isVideo = /\.(mp4|webm|mkv|mov|avi)$/i.test(extension);

        return {
            title: metadata.common.title || fileName.replace(extension, ''),
            artist: metadata.common.artist || 'Unknown Artist',
            album: metadata.common.album || (isVideo ? 'Videos' : 'Unknown Album'),
            genre: metadata.common.genre || [],
            duration: metadata.format.duration || 0,
            picture: pictureBase64,
            path: filePath
        };
    } catch (error) {
        console.error(`Error parsing metadata for ${filePath}:`, error.message);
        throw error; // Rethrow to let the main process handle fallback
    }
}

module.exports = {
    parse
};
