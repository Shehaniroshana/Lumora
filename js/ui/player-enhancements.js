// ============================================================
// LUMORA MUSIC PLAYER — player-enhancements.js
// Enhanced player UI interactions and visual feedback
// ============================================================

import { audio } from '../core/audio.js';

/**
 * Initialize enhanced player UI interactions
 */
export function initPlayerEnhancements() {
    initSeekBarEnhancements();
    initVolumeBarEnhancements();
    initPlayButtonEnhancements();
}

/**
 * Enhanced seek bar with visual progress fill and hover preview
 */
function initSeekBarEnhancements() {
    const seekBar = document.getElementById('seek-bar');
    const seekBarContainer = document.querySelector('.seek-bar-container');
    const seekBarProgress = document.querySelector('.seek-bar-progress');
    const seekBarHover = document.querySelector('.seek-bar-hover');

    if (!seekBar || !seekBarContainer || !seekBarProgress) return;

    // Update visual progress fill
    const updateProgressFill = () => {
        const progress = seekBar.value;
        if (seekBarProgress) {
            seekBarProgress.style.width = `${progress}%`;
        }
    };

    // Update progress fill on time update
    audio.addEventListener('timeupdate', updateProgressFill);
    seekBar.addEventListener('input', updateProgressFill);

    // Hover preview effect
    if (seekBarHover) {
        seekBarContainer.addEventListener('mousemove', (e) => {
            const rect = seekBarContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;
            seekBarHover.style.left = '0';
            seekBarHover.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        });

        seekBarContainer.addEventListener('mouseleave', () => {
            seekBarHover.style.width = '0';
        });
    }
}

/**
 * Enhanced volume bar with visual fill
 */
function initVolumeBarEnhancements() {
    const volumeBar = document.getElementById('volume-bar');
    const volumeBarFill = document.querySelector('.volume-bar-fill');

    if (!volumeBar || !volumeBarFill) return;

    // Update visual volume fill
    const updateVolumeFill = () => {
        const volume = volumeBar.value;
        volumeBarFill.style.width = `${volume}%`;
    };

    volumeBar.addEventListener('input', updateVolumeFill);
    
    // Initialize on load
    updateVolumeFill();
}

/**
 * Enhanced play button interactions
 */
function initPlayButtonEnhancements() {
    const playBtn = document.getElementById('play-pause-btn');
    
    if (!playBtn) return;

    // Add ripple effect on click
    playBtn.addEventListener('click', (e) => {
        const ripple = playBtn.querySelector('.play-btn-ripple');
        if (ripple) {
            ripple.style.animation = 'none';
            setTimeout(() => {
                ripple.style.animation = '';
            }, 10);
        }
    });
}

/**
 * Update album art glow effect based on art colors
 * @param {string} artSrc - Source of the album art
 */
export function updateArtGlow(artSrc) {
    const artGlow = document.querySelector('.art-glow');
    if (!artGlow || !artSrc) return;

    // Create a canvas to extract dominant color
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = artSrc;
    
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Sample center pixel for glow color
            const imageData = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1);
            const [r, g, b] = imageData.data;
            
            artGlow.style.background = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.6) 0%, transparent 70%)`;
            artGlow.style.opacity = '0.6';
        } catch (e) {
            console.warn('Could not extract art color:', e);
        }
    };
}

/**
 * Animate track info change
 */
export function animateTrackChange() {
    const title = document.getElementById('track-title');
    const artist = document.getElementById('track-artist');
    
    if (title) {
        title.style.animation = 'none';
        setTimeout(() => {
            title.style.animation = 'fadeInUp 0.4s ease';
        }, 10);
    }
    
    if (artist) {
        artist.style.animation = 'none';
        setTimeout(() => {
            artist.style.animation = 'fadeInUp 0.5s ease';
        }, 10);
    }
}

// Add fade-in animation keyframes via style injection
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
