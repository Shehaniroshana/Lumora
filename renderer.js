// ============================================================
// SOUNDSTORM MUSIC PLAYER — renderer.js
// Open Source Desktop MP3 Player
// ============================================================

// ===================== STATE =====================





import { addFolderBtn, addFolderBtn2, playlistEl, loadingIndicator, libraryCount, playbackControls, playPauseBtn, playIcon, pauseIcon, prevBtn, nextBtn, shuffleBtn, repeatBtn, seekBar, timeCurrent, timeTotal, volumeBar, muteBtn, volIconOn, volIconOff, trackTitle, trackArtist, trackArt, artPlaceholder, eqBars, bgBlur, playerFavBtn, favCountBadge, favCountText, favoritesList, favoritesEmpty, searchInput, searchResults, searchHint, playlistsNavList, newPlaylistBtn, folderList, settingsBtn, settingsModal, closeSettingsBtn, createPlaylistModal, closeCreatePlaylistBtn, cancelCreatePlaylistBtn, confirmCreatePlaylistBtn, newPlaylistNameInput, contextMenu, ctxPlay, ctxFav, ctxAddPlaylist, ctxPlaylistSubmenu, ctxRemovePlaylist, ctxReveal, ctxRename, ctxDelete, renameModal, closeRenameBtn, cancelRenameBtn, confirmRenameBtn, renameInput, deletePlaylistBtn, playlistViewName, playlistViewCount, playlistViewSongs, playlistEmpty, addSongsToPlaylistBtn, songPickerModal, closeSongPickerBtn, cancelSongPickerBtn, confirmSongPickerBtn, songPickerSearch, songPickerList, songPickerSelectedCount, toast, colorPicker, bgColorPicker, panelColorPicker, glassOpacity, opacityVal, blurIntensity, blurVal, fontSelect, resetSettingsBtn, bgImageBtn, clearBgImageBtn, fontDropdown, fontDropdownTrigger, fontDropdownMenu, fontDropdownLabel, canvas, mobileMenuBtn, sidebar, sidebarOverlay, videoPlayerContainer, videoPlayer, closeVideoBtn, videosList, videosCount, videosEmpty, videoCountBadge, videoPlayerMain, mainVideoPlayer, currentVideoTitle, loadSubtitleBtn, closeVideoPlayerBtn, librarySortBtn, librarySortLabel, librarySortMenu, videosSortBtn, videosSortLabel, videosSortMenu, prevVideoBtn, nextVideoBtn, videoQualityBadge } from './js/ui/dom.js';
import { state, saveFavorites, savePlaylists, saveFolders, saveLastTrack, getLastTrack, saveLastTrackTime, getLastTrackTime } from './js/core/state.js';
import { escapeHtml, showToast, formatTime } from './js/core/utils.js';
import { initSettings, setAppWallpaper } from './js/ui/settings.js';
import { initAudio, playSong, togglePlay, nextSong, prevSong, audio } from './js/core/audio.js';
import { initPlayerEnhancements, animateTrackChange, updateArtGlow } from './js/ui/player-enhancements.js';




const canvasCtx = canvas.getContext('2d');

// Polyfill for requestIdleCallback
window.requestIdleCallback = window.requestIdleCallback || function (cb) {
    const start = Date.now();
    return setTimeout(() => {
        cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
        });
    }, 1);
};

// ===================== MEMORY MANAGEMENT =====================
/**
 * Memory optimizations implemented:
 * 1. Thumbnail queue - Limits concurrent video thumbnail generation to 3
 * 2. Proper video cleanup - Removes video elements and frees resources after use
 * 3. Smaller thumbnails - Reduced from 320x180 to 280x158, JPEG quality 60%
 * 4. Batch rendering - Videos render in batches of 12 using requestAnimationFrame
 * 5. Periodic cleanup - Clears excessive thumbnail queue every minute
 * 6. Context optimization - Canvas contexts created with performance flags
 * 7. Queue clearing - Thumbnail queue cleared when leaving videos view
 */

// Periodic cleanup to prevent memory leaks
setInterval(() => {
    // Clear thumbnail queue if it gets too large
    if (thumbnailQueue.length > 20) {
        console.log('Clearing excessive thumbnail queue');
        thumbnailQueue = [];
    }
    
    // Force garbage collection hint (if available)
    if (global.gc) {
        global.gc();
    }
}, 60000); // Every minute

// ===================== INIT =====================
async function init() {
    // Show app loader
    const appLoader = document.getElementById('app-loader');
    
    // Critical path - do this first for fast initial render
    initSettings();
    renderPlaylistsNav();
    renderFolderList();
    updateFavBadge();
    
    // Defer non-critical initialization
    requestIdleCallback(() => {
        initPlayerEnhancements();
    });
    
    initAudio({
        onSongChange: (song) => {
            updatePlayerFavIcon(song.path);
            highlightCurrentSong();
            animateTrackChange();
            if (song.picture) {
                updateArtGlow(song.picture);
            }
        },
        onWallpaperUpdate: (uri) => setAppWallpaper(uri)
    });

    // Defer folder scanning to not block initial render
    setTimeout(async () => {
        if (state.scannedFolders.length > 0) {
            // User has previously added folders — scan those
            await scanFolders(state.scannedFolders);
        } else {
            // First launch OR no folders saved: auto-detect default system music dirs
            const defaultDirs = await electronAPI.getDefaultDirs();
            if (defaultDirs && defaultDirs.length > 0) {
                state.scannedFolders = defaultDirs;
                saveFolders();
                renderFolderList();
                showToast('🎵 Scanning your Music and Downloads folders...');
                await scanFolders(defaultDirs);
            }
        }

        // Restore last played track after initial render
        restoreLastTrack();
        
        // Hide app loader after everything is ready
        setTimeout(() => {
            if (appLoader) {
                appLoader.classList.add('hidden');
            }
        }, 100);
    }, 50); // Small delay to let UI render first
}
init();

// ===================== RESTORE LAST TRACK =====================
function restoreLastTrack() {
    const lastTrackPath = getLastTrack();
    const lastTrackTime = getLastTrackTime();
    
    if (lastTrackPath && state.playlist.length > 0) {
        const trackIndex = state.playlist.findIndex(track => track.path === lastTrackPath);
        if (trackIndex !== -1) {
            // Load the track but don't auto-play
            state.currentIndex = trackIndex;
            const song = state.playlist[trackIndex];
            
            trackTitle.textContent = song.title;
            trackArtist.textContent = song.artist;
            
            if (song.picture) {
                trackArt.src = song.picture;
                trackArt.classList.remove('hidden');
                artPlaceholder.classList.add('hidden');
                updateArtGlow(song.picture);
            } else {
                trackArt.src = '';
                trackArt.classList.add('hidden');
                artPlaceholder.classList.remove('hidden');
            }
            
            // Load the audio file and set saved time
            audio.src = window.electronAPI.getFileUri(song.path);
            audio.load();
            
            // Wait for metadata to load before setting currentTime
            audio.addEventListener('loadedmetadata', () => {
                if (lastTrackTime > 0 && lastTrackTime < audio.duration) {
                    audio.currentTime = lastTrackTime;
                }
            }, { once: true });
            
            updatePlayerFavIcon(song.path);
            highlightCurrentSong();
        }
    }
}

// ===================== VIEWS =====================
function switchView(viewId, params = {}) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${viewId}`);
    if (view) view.classList.add('active');

    const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (navItem) navItem.classList.add('active');

    state.currentView = viewId;

    if (viewId === 'favorites') renderFavoritesView();
    if (viewId === 'playlist' && params.id) openPlaylistView(params.id);
    if (viewId === 'folders') renderFolderList();
    if (viewId === 'search') searchInput.focus();
    if (viewId === 'videos') renderVideosView();

    // Hide audio player bar when in videos view and adjust layout
    const appLayout = document.querySelector('.app-layout');
    if (playbackControls) {
        if (viewId === 'videos') {
            playbackControls.style.display = 'none';
            if (appLayout) appLayout.classList.add('full-height');
        } else {
            playbackControls.style.display = '';
            if (appLayout) appLayout.classList.remove('full-height');
        }
    }

    // Close mobile sidebar if open
    if (sidebar && sidebar.classList.contains('sidebar-open')) {
        sidebar.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
    }
    
    // Clear thumbnail queue when leaving videos view
    if (viewId !== 'videos' && thumbnailQueue.length > 0) {
        thumbnailQueue = [];
    }
}

document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
});

// Mobile Sidebar Toggle
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('sidebar-open');
        if (isOpen) {
            sidebar.classList.remove('sidebar-open');
            sidebarOverlay.classList.remove('active');
        } else {
            sidebar.classList.add('sidebar-open');
            sidebarOverlay.classList.add('active');
        }
    });
}
if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
    });
}

// ===================== SORTING =====================
let currentLibrarySort = localStorage.getItem('soundstorm-library-sort') || 'title';
let currentVideosSort = localStorage.getItem('soundstorm-videos-sort') || 'title';

function sortItems(items, sortBy) {
    const sorted = [...items];
    switch (sortBy) {
        case 'title':
            return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        case 'artist':
            return sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
        case 'album':
            return sorted.sort((a, b) => (a.album || '').localeCompare(b.album || ''));
        case 'duration':
            return sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        case 'dateAdded':
            return sorted.reverse(); // Newest first (assuming array order = add order)
        default:
            return sorted;
    }
}

function updateSortLabel(label, sortBy) {
    const labels = {
        title: 'Title',
        artist: 'Artist',
        album: 'Album',
        duration: 'Duration',
        dateAdded: 'Date Added'
    };
    label.textContent = labels[sortBy] || 'Title';
}

// Library sort dropdown
librarySortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    librarySortBtn.parentElement.classList.toggle('open');
    librarySortMenu.classList.toggle('hidden');
    videosSortMenu.classList.add('hidden');
    videosSortBtn.parentElement.classList.remove('open');
});

librarySortMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('sort-option')) {
        currentLibrarySort = e.target.dataset.sort;
        localStorage.setItem('soundstorm-library-sort', currentLibrarySort);
        librarySortBtn.parentElement.classList.remove('open');
        librarySortMenu.classList.add('hidden');
        renderLibraryView();
    }
});

// Videos sort dropdown
videosSortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    videosSortBtn.parentElement.classList.toggle('open');
    videosSortMenu.classList.toggle('hidden');
    librarySortMenu.classList.add('hidden');
    librarySortBtn.parentElement.classList.remove('open');
});

videosSortMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('sort-option')) {
        currentVideosSort = e.target.dataset.sort;
        localStorage.setItem('soundstorm-videos-sort', currentVideosSort);
        videosSortBtn.parentElement.classList.remove('open');
        videosSortMenu.classList.add('hidden');
        renderVideosView();
    }
});

// Close sort menus when clicking outside
document.addEventListener('click', () => {
    librarySortMenu.classList.add('hidden');
    videosSortMenu.classList.add('hidden');
    librarySortBtn.parentElement.classList.remove('open');
    videosSortBtn.parentElement.classList.remove('open');
});

// ===================== FOLDER MANAGEMENT =====================
async function doAddFolder() {
    const dirs = await electronAPI.openDirectory();
    if (dirs && dirs.length > 0) {
        const newFolders = dirs.filter(d => !state.scannedFolders.includes(d));
        state.scannedFolders = [...state.scannedFolders, ...newFolders];
        saveFolders();
        renderFolderList();
        if (newFolders.length > 0) await scanFolders(newFolders);
    }
}

addFolderBtn.addEventListener('click', doAddFolder);
addFolderBtn2.addEventListener('click', doAddFolder);

function renderFolderList() {
    folderList.innerHTML = '';
    if (state.scannedFolders.length === 0) {
        folderList.innerHTML = '<li style="padding: 20px; color: var(--text-muted); text-align: center; font-size: 0.9rem;">No folders added yet. Click "Add Folder" to get started.</li>';
        return;
    }
    state.scannedFolders.forEach((folder, idx) => {
        const li = document.createElement('li');
        li.className = 'folder-item';
        li.innerHTML = `
            <div class="folder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span class="folder-path" title="${folder}">${folder}</span>
            <button class="folder-remove-btn" data-idx="${idx}" title="Remove folder">✕</button>
        `;
        folderList.appendChild(li);
    });

    folderList.querySelectorAll('.folder-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            state.scannedFolders.splice(idx, 1);
            saveFolders();
            showToast('Folder removed. Refresh to rescan library.');
            renderFolderList();
        });
    });
}

// ===================== LIBRARY SCANNING =====================
async function scanFolders(dirs) {
    loadingIndicator.classList.remove('hidden');

    return electronAPI.scanDirectories(dirs).then(async (files) => {
        for (const file of files) {
            if (!state.playlist.find(item => item.path === file)) {
                const metadata = await electronAPI.parseMetadata(file);
                state.playlist.push(metadata);
                // Only render if it's audio and we're on library view
                if (!isVideoFile(file) && state.currentView === 'library') {
                    const originalIndex = state.playlist.indexOf(metadata);
                    renderSongRow(metadata, originalIndex, playlistEl);
                }
            }
        }
        updateLibraryCount();
        updateVideoCount();
        loadingIndicator.classList.add('hidden');
        
        // Update videos view if currently viewing
        if (state.currentView === 'videos') {
            renderVideosView();
        }
    });
}

function updateLibraryCount() {
    const audioCount = state.playlist.filter(item => !isVideoFile(item.path)).length;
    libraryCount.textContent = `${audioCount} song${audioCount !== 1 ? 's' : ''}`;
}

function updateVideoCount() {
    const videoCount = state.playlist.filter(item => isVideoFile(item.path)).length;
    videosCount.textContent = `${videoCount} video${videoCount !== 1 ? 's' : ''}`;
    
    // Update badge
    if (videoCount > 0) {
        videoCountBadge.textContent = videoCount;
        videoCountBadge.classList.remove('hidden');
    } else {
        videoCountBadge.classList.add('hidden');
    }
}

function renderLibraryView() {
    playlistEl.innerHTML = '';
    // Filter out videos - only show audio files in library
    const audioFiles = state.playlist.filter(item => !isVideoFile(item.path));
    
    // Sort audio files
    const sorted = sortItems(audioFiles, currentLibrarySort);
    
    // Batch render for better performance
    const BATCH_SIZE = 20; // Render 20 songs at a time
    let currentBatch = 0;
    
    const renderBatch = () => {
        const start = currentBatch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, sorted.length);
        
        // Use DocumentFragment for efficient DOM insertion
        const fragment = document.createDocumentFragment();
        
        for (let i = start; i < end; i++) {
            const song = sorted[i];
            const originalIndex = state.playlist.indexOf(song);
            const li = createSongRowElement(song, originalIndex, playlistEl);
            fragment.appendChild(li);
        }
        
        playlistEl.appendChild(fragment);
        currentBatch++;
        
        // Continue rendering in next frame if more items exist
        if (currentBatch * BATCH_SIZE < sorted.length) {
            requestAnimationFrame(renderBatch);
        }
    };
    
    // Start rendering
    renderBatch();
    
    updateLibraryCount();
    updateSortLabel(librarySortLabel, currentLibrarySort);
    
    // Update selected state in menu
    librarySortMenu.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.sort === currentLibrarySort);
    });
}

// Helper to check if file is video
function isVideoFile(path) {
    return path && /\.(mp4|webm|ogg|mkv|mov|avi)$/i.test(path);
}

// ===================== SONG ROW RENDERER =====================
// Create song row element without immediately appending (for batch rendering)
function createSongRowElement(item, index, container, fromPlaylistId = null) {
    const li = document.createElement('li');
    li.className = 'song-row';
    li.dataset.index = index;

    const isFav = state.favorites.includes(item.path);
    const artSrc = item.picture || '';
    const defaultArt = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`;

    li.innerHTML = `
        <span class="song-num">${index + 1}</span>
        ${artSrc
            ? `<img src="${artSrc}" class="song-art-small" loading="lazy" alt="">`
            : `<div class="song-art-small" style="display:flex;align-items:center;justify-content:center;color:var(--text-dim);width:40px;height:40px;">${defaultArt}</div>`
        }
        <div class="song-info">
            <span class="song-title">${escapeHtml(item.title)}</span>
            <span class="song-meta">${escapeHtml(item.artist)}${item.album ? ' • ' + escapeHtml(item.album) : ''}</span>
        </div>
        <span class="song-duration">${item.duration ? formatTime(item.duration) : ''}</span>
        <button class="song-fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
            <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
    `;

    li.querySelectorAll('img.song-art-small').forEach(img => {
        img.addEventListener('error', () => {
            const div = document.createElement('div');
            div.className = 'song-art-small';
            div.style.cssText = 'display:flex;align-items:center;justify-content:center;color:var(--text-dim);width:40px;height:40px;';
            div.innerHTML = defaultArt;
            img.replaceWith(div);
        }, { once: true });
    });

    // Click to play audio
    li.addEventListener('click', (e) => {
        if (e.target.closest('.song-fav-btn')) return;
        state.playQueueContext = Array.from(e.currentTarget.parentElement.querySelectorAll('.song-row')).map(r => parseInt(r.dataset.index));
        playSong(index);
    });

    // Fav button inside song row
    li.querySelector('.song-fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const isFavNow = !state.favorites.includes(item.path);   // what it WILL be after toggle
        toggleFavorite(item.path);                          // toggle it
        // Immediately update this row visually
        const btn = e.currentTarget;
        btn.classList.toggle('active', isFavNow);
        btn.title = isFavNow ? 'Remove from Favorites' : 'Add to Favorites';
        const svg = btn.querySelector('svg');
        svg.setAttribute('fill', isFavNow ? 'currentColor' : 'none');
        svg.setAttribute('stroke', isFavNow ? 'var(--primary)' : 'currentColor');
        // Sync all other rows showing the same song
        syncFavIconsForPath(item.path, isFavNow);
    });

    // Right-click for context menu
    li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, index, fromPlaylistId);
    });

    container.appendChild(li);
    return li;
}

// Wrapper function for backwards compatibility
function renderSongRow(item, index, container, fromPlaylistId = null) {
    return createSongRowElement(item, index, container, fromPlaylistId);
}

// Sync fav icons across all song rows that show the same path
function syncFavIconsForPath(path, isFav) {
    document.querySelectorAll('.song-row').forEach(row => {
        const idx = parseInt(row.dataset.index);
        if (!isNaN(idx) && state.playlist[idx] && state.playlist[idx].path === path) {
            const btn = row.querySelector('.song-fav-btn');
            if (btn) {
                btn.classList.toggle('active', isFav);
                btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
                const svg = btn.querySelector('svg');
                svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
                svg.setAttribute('stroke', isFav ? 'var(--primary)' : 'currentColor');
            }
        }
    });
    updateFavBadge();
}

function highlightCurrentSong() {
    document.querySelectorAll('.song-row').forEach(row => {
        const idx = parseInt(row.dataset.index);
        row.classList.toggle('playing', idx === state.currentIndex);
    });
}

// ===================== FAVORITES =====================
function toggleFavorite(path) {
    const idx = state.favorites.indexOf(path);
    if (idx === -1) {
        state.favorites.push(path);
        showToast('❤ Added to Favorites');
    } else {
        state.favorites.splice(idx, 1);
        showToast('Removed from Favorites');
    }
    saveFavorites();
    updateFavBadge();
    // Update player fav icon if this is the current song
    if (state.currentIndex >= 0) updatePlayerFavIcon(state.playlist[state.currentIndex].path);
    // Refresh state.favorites view if it's open
    if (state.currentView === 'favorites') renderFavoritesView();
}

function updateFavBadge() {
    const count = state.favorites.length;
    favCountBadge.textContent = count;
    favCountBadge.classList.toggle('hidden', count === 0);
    if (favCountText) favCountText.textContent = `${count} song${count !== 1 ? 's' : ''}`;
}

function updatePlayerFavIcon(path) {
    const isFav = state.favorites.includes(path);
    playerFavBtn.classList.toggle('active', isFav);
    const svg = playerFavBtn.querySelector('svg');
    if (svg) {
        svg.setAttribute('fill', isFav ? 'var(--primary)' : 'none');
        svg.setAttribute('stroke', isFav ? 'var(--primary)' : 'currentColor');
    }
    playerFavBtn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
}

function renderFavoritesView() {
    favoritesList.innerHTML = '';
    // state.favorites is a list of file paths; find matching songs in library
    const favSongs = state.favorites
        .map(path => state.playlist.find(s => s.path === path))
        .filter(Boolean);  // ignore any saved paths no longer in library

    if (favSongs.length === 0) {
        favoritesEmpty.classList.remove('hidden');
        return;
    }

    favoritesEmpty.classList.add('hidden');
    
    // Batch render favorites if there are many
    if (favSongs.length > 20) {
        const BATCH_SIZE = 15;
        let currentBatch = 0;
        
        const renderBatch = () => {
            const start = currentBatch * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, favSongs.length);
            
            const fragment = document.createDocumentFragment();
            
            for (let i = start; i < end; i++) {
                const song = favSongs[i];
                const originalIndex = state.playlist.indexOf(song);
                const li = createSongRowElement(song, originalIndex, favoritesList);
                // Remove from container since we're using fragment
                li.remove();
                fragment.appendChild(li);
            }
            
            favoritesList.appendChild(fragment);
            currentBatch++;
            
            if (currentBatch * BATCH_SIZE < favSongs.length) {
                requestAnimationFrame(renderBatch);
            }
        };
        
        renderBatch();
    } else {
        favSongs.forEach((song, idx) => {
            const originalIndex = state.playlist.indexOf(song);
            renderSongRow(song, originalIndex, favoritesList);
        });
    }
}

// ===================== VIDEOS VIEW =====================
function renderVideosView() {
    videosList.innerHTML = '';
    const videoFiles = state.playlist.filter(item => isVideoFile(item.path));
    
    updateVideoCount();
    
    if (videoFiles.length === 0) {
        videosEmpty.classList.remove('hidden');
        updateSortLabel(videosSortLabel, currentVideosSort);
        videosSortMenu.querySelectorAll('.sort-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.sort === currentVideosSort);
        });
        return;
    }
    
    videosEmpty.classList.add('hidden');
    
    // Sort video files
    const sorted = sortItems(videoFiles, currentVideosSort);
    
    // Render videos in batches for better performance
    const BATCH_SIZE = 12;
    let currentBatch = 0;
    
    const renderBatch = () => {
        const start = currentBatch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, sorted.length);
        
        for (let idx = start; idx < end; idx++) {
            const video = sorted[idx];
            const originalIndex = state.playlist.indexOf(video);
            renderVideoCard(video, originalIndex);
        }
        
        currentBatch++;
        
        if (currentBatch * BATCH_SIZE < sorted.length) {
            requestAnimationFrame(renderBatch);
        }
    };
    
    renderBatch();
    
    updateSortLabel(videosSortLabel, currentVideosSort);
    
    // Update selected state in menu
    videosSortMenu.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.sort === currentVideosSort);
    });
}

// Thumbnail generation queue to limit concurrent video loading
let thumbnailQueue = [];
let activeThumbnailGenerations = 0;
const MAX_CONCURRENT_THUMBNAILS = 3;

function processThumbnailQueue() {
    while (thumbnailQueue.length > 0 && activeThumbnailGenerations < MAX_CONCURRENT_THUMBNAILS) {
        const task = thumbnailQueue.shift();
        task();
    }
}

function cleanupVideoElement(videoElement) {
    if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
        videoElement.remove();
    }
}

function renderVideoCard(video, index) {
    const li = document.createElement('li');
    li.className = 'video-item';
    li.dataset.index = index;
    
    // Create thumbnail container
    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'video-thumbnail';
    
    // Set a default gradient background
    thumbnailDiv.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    // Generate thumbnail lazily
    const generateThumbnail = () => {
        activeThumbnailGenerations++;
        
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = 280; // Reduced from 320
        thumbnailCanvas.height = 158; // Reduced from 180
        const ctx = thumbnailCanvas.getContext('2d', { 
            willReadFrequently: false,
            alpha: false // No alpha channel for better performance
        });
        
        // Create temporary video element to capture frame
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.style.display = 'none';
        tempVideo.src = window.electronAPI.getFileUri(video.path);
        
        let isCleanedUp = false;
        const cleanup = () => {
            if (isCleanedUp) return;
            isCleanedUp = true;
            cleanupVideoElement(tempVideo);
            activeThumbnailGenerations--;
            processThumbnailQueue();
        };
        
        const timeoutId = setTimeout(() => {
            cleanup();
        }, 5000); // 5 second timeout
        
        // Wait for metadata to load, then seek to 1 second
        const onMetadata = () => {
            if (isCleanedUp) return;
            tempVideo.currentTime = Math.min(1, tempVideo.duration / 4);
        };
        
        // When seeking is complete, capture the frame
        const onSeeked = () => {
            if (isCleanedUp) return;
            try {
                ctx.drawImage(tempVideo, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
                const thumbnailImg = document.createElement('img');
                thumbnailImg.src = thumbnailCanvas.toDataURL('image/jpeg', 0.6); // Reduced quality
                thumbnailImg.className = 'video-thumbnail-img';
                thumbnailImg.onload = () => {
                    thumbnailDiv.style.background = 'none';
                };
                thumbnailDiv.appendChild(thumbnailImg);
            } catch (e) {
                console.error('Failed to generate thumbnail:', e);
            } finally {
                clearTimeout(timeoutId);
                cleanup();
            }
        };
        
        const onError = (e) => {
            console.error('Video thumbnail error:', e);
            clearTimeout(timeoutId);
            cleanup();
        };
        
        tempVideo.addEventListener('loadedmetadata', onMetadata, { once: true });
        tempVideo.addEventListener('seeked', onSeeked, { once: true });
        tempVideo.addEventListener('error', onError, { once: true });
    };
    
    // Add to queue instead of generating immediately
    thumbnailQueue.push(generateThumbnail);
    processThumbnailQueue();
    
    // Play overlay
    const overlay = document.createElement('div');
    overlay.className = 'video-play-overlay';
    overlay.innerHTML = `
        <div class="video-play-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
        </div>
    `;
    thumbnailDiv.appendChild(overlay);
    
    // Duration badge
    if (video.duration) {
        const durationSpan = document.createElement('span');
        durationSpan.className = 'video-duration';
        durationSpan.textContent = formatTime(video.duration);
        thumbnailDiv.appendChild(durationSpan);
    }
    
    li.appendChild(thumbnailDiv);
    
    // Video info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'video-info';
    infoDiv.innerHTML = `
        <h3 class="video-title">${escapeHtml(video.title)}</h3>
    `;
    li.appendChild(infoDiv);
    
    li.addEventListener('click', () => {
        playVideoInMainPlayer(video, index);
    });
    
    // Right-click context menu for videos
    li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showVideoContextMenu(e, video, index);
    });
    
    videosList.appendChild(li);
}

let currentVideoIndex = -1; // Track which video is currently playing

function playVideoInMainPlayer(video, index) {
    // Show video player in main content area
    videoPlayerMain.classList.remove('hidden');
    
    // Clean up previous video
    mainVideoPlayer.pause();
    const oldTracks = mainVideoPlayer.querySelectorAll('track');
    oldTracks.forEach(track => track.remove());
    
    mainVideoPlayer.src = window.electronAPI.getFileUri(video.path);
    currentVideoTitle.textContent = video.title;
    currentVideoIndex = index;
    
    // Hide quality badge until metadata loads
    if (videoQualityBadge) {
        videoQualityBadge.classList.add('hidden');
    }
    
    // Get video quality when metadata is loaded
    const onMetadataLoaded = () => {
        const width = mainVideoPlayer.videoWidth;
        const height = mainVideoPlayer.videoHeight;
        
        if (width && height && videoQualityBadge) {
            // Determine quality label
            let qualityLabel = '';
            if (height >= 2160) qualityLabel = '4K';
            else if (height >= 1440) qualityLabel = '2K';
            else if (height >= 1080) qualityLabel = '1080p';
            else if (height >= 720) qualityLabel = '720p';
            else if (height >= 480) qualityLabel = '480p';
            else qualityLabel = `${width}x${height}`;
            
            videoQualityBadge.textContent = qualityLabel;
            videoQualityBadge.classList.remove('hidden');
        }
        
        mainVideoPlayer.removeEventListener('loadedmetadata', onMetadataLoaded);
    };
    
    mainVideoPlayer.addEventListener('loadedmetadata', onMetadataLoaded);
    mainVideoPlayer.play();
    
    // Update button states
    updateVideoNavigationButtons();
    
    // Scroll to video player
    videoPlayerMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateVideoNavigationButtons() {
    const videoFiles = state.playlist.filter(item => isVideoFile(item.path));
    const currentIndexInVideoList = videoFiles.findIndex(v => state.playlist.indexOf(v) === currentVideoIndex);
    
    if (prevVideoBtn) {
        prevVideoBtn.disabled = currentIndexInVideoList <= 0;
        prevVideoBtn.style.opacity = currentIndexInVideoList <= 0 ? '0.4' : '1';
    }
    if (nextVideoBtn) {
        nextVideoBtn.disabled = currentIndexInVideoList >= videoFiles.length - 1;
        nextVideoBtn.style.opacity = currentIndexInVideoList >= videoFiles.length - 1 ? '0.4' : '1';
    }
}

function playPreviousVideo() {
    const videoFiles = state.playlist.filter(item => isVideoFile(item.path));
    const currentIndexInVideoList = videoFiles.findIndex(v => state.playlist.indexOf(v) === currentVideoIndex);
    
    if (currentIndexInVideoList > 0) {
        const prevVideo = videoFiles[currentIndexInVideoList - 1];
        const prevIndex = state.playlist.indexOf(prevVideo);
        playVideoInMainPlayer(prevVideo, prevIndex);
    }
}

function playNextVideo() {
    const videoFiles = state.playlist.filter(item => isVideoFile(item.path));
    const currentIndexInVideoList = videoFiles.findIndex(v => state.playlist.indexOf(v) === currentVideoIndex);
    
    if (currentIndexInVideoList < videoFiles.length - 1) {
        const nextVideo = videoFiles[currentIndexInVideoList + 1];
        const nextIndex = state.playlist.indexOf(nextVideo);
        playVideoInMainPlayer(nextVideo, nextIndex);
    }
}

// ===================== FAVORITES =====================
// Favorite button on player bar
playerFavBtn.addEventListener('click', () => {
    if (state.currentIndex < 0 || !state.playlist[state.currentIndex]) return;
    const song = state.playlist[state.currentIndex];
    const isFavNow = !state.favorites.includes(song.path);   // what it WILL be
    toggleFavorite(song.path);                          // toggle
    syncFavIconsForPath(song.path, isFavNow);
    // Update the player bar button itself
    playerFavBtn.classList.toggle('active', isFavNow);
    const svg = playerFavBtn.querySelector('svg');
    svg.setAttribute('fill', isFavNow ? 'var(--primary)' : 'none');
    svg.setAttribute('stroke', isFavNow ? 'var(--primary)' : 'currentColor');
});

// ===================== VIDEO PLAYER CONTROLS =====================
// Previous video button
if (prevVideoBtn) {
    prevVideoBtn.addEventListener('click', () => {
        playPreviousVideo();
    });
}

// Next video button
if (nextVideoBtn) {
    nextVideoBtn.addEventListener('click', () => {
        playNextVideo();
    });
}

// Close video player
if (closeVideoPlayerBtn) {
    closeVideoPlayerBtn.addEventListener('click', () => {
        // Properly cleanup video element
        mainVideoPlayer.pause();
        
        // Remove subtitle tracks
        const tracks = mainVideoPlayer.querySelectorAll('track');
        tracks.forEach(track => track.remove());
        
        // Clear source and force unload
        mainVideoPlayer.removeAttribute('src');
        mainVideoPlayer.load();
        
        videoPlayerMain.classList.add('hidden');
        currentVideoIndex = -1;
        if (videoQualityBadge) {
            videoQualityBadge.classList.add('hidden');
        }
        showToast('Video closed');
    });
}

// Load subtitle file
if (loadSubtitleBtn) {
    loadSubtitleBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.openFileDialog({
            title: 'Select Subtitle File',
            filters: [
                { name: 'Subtitle Files', extensions: ['srt', 'vtt', 'ass', 'sub'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        
        if (result && result.length > 0) {
            const subtitlePath = result[0];
            addSubtitleTrack(subtitlePath);
            showToast('Subtitle loaded');
        }
    });
}

function addSubtitleTrack(subtitlePath) {
    // Remove existing tracks
    const existingTracks = mainVideoPlayer.querySelectorAll('track');
    existingTracks.forEach(track => track.remove());
    
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'Subtitles';
    track.srclang = 'en';
    track.src = window.electronAPI.getFileUri(subtitlePath);
    track.default = true;
    
    mainVideoPlayer.appendChild(track);
    
    // Enable the track
    track.addEventListener('load', () => {
        track.mode = 'showing';
    });
}

// Video ended event - auto-play next video
if (mainVideoPlayer) {
    mainVideoPlayer.addEventListener('ended', () => {
        const videoFiles = state.playlist.filter(item => isVideoFile(item.path));
        const currentIndexInVideoList = videoFiles.findIndex(v => state.playlist.indexOf(v) === currentVideoIndex);
        
        if (currentIndexInVideoList < videoFiles.length - 1) {
            // Auto-play next video
            playNextVideo();
        } else {
            showToast('Playlist ended');
        }
    });
}

// Close floating video player (old one - keeping for compatibility)
if (closeVideoBtn) {
    closeVideoBtn.addEventListener('click', () => {
        videoPlayer.pause();
        videoPlayer.src = '';
        videoPlayerContainer.classList.add('hidden');
    });
}

// ===================== PLAYLISTS =====================
function createPlaylist(name) {
    const id = 'pl_' + Date.now();
    state.playlists.push({ id, name, songs: [] });
    savePlaylists();
    renderPlaylistsNav();
    showToast(`Playlist "${name}" created`);
    return id;
}

function renderPlaylistsNav() {
    playlistsNavList.innerHTML = '';
    state.playlists.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'nav-item' + (state.activePlaylistId === pl.id && state.currentView === 'playlist' ? ' active' : '');
        div.dataset.view = 'playlist';
        div.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm-12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
            <span>${escapeHtml(pl.name)}</span>
            <span style="margin-left:auto;font-size:0.75rem;color:var(--text-dim)">${pl.songs.length}</span>
        `;
        div.addEventListener('click', () => {
            state.activePlaylistId = pl.id;
            switchView('playlist', { id: pl.id });
        });
        playlistsNavList.appendChild(div);
    });
}

function openPlaylistView(id) {
    state.activePlaylistId = id;
    const pl = state.playlists.find(p => p.id === id);
    if (!pl) return;
    playlistViewName.textContent = pl.name;
    playlistViewSongs.innerHTML = '';
    const songs = pl.songs.map(path => state.playlist.find(s => s.path === path)).filter(Boolean);
    playlistViewCount.textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
    playlistEmpty.classList.toggle('hidden', songs.length > 0);
    songs.forEach((song) => {
        const realIndex = state.playlist.indexOf(song);
        renderSongRow(song, realIndex, playlistViewSongs, id);
    });
    renderPlaylistsNav();
}

function addSongToPlaylist(playlistId, songPath) {
    const pl = state.playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (pl.songs.includes(songPath)) {
        showToast('Song already in playlist');
        return;
    }
    pl.songs.push(songPath);
    savePlaylists();
    renderPlaylistsNav();
    showToast(`Added to "${pl.name}"`);
    if (state.activePlaylistId === playlistId && state.currentView === 'playlist') openPlaylistView(playlistId);
}

// ===================== SONG PICKER =====================
let songPickerSelected = new Set();  // paths selected in the picker

function openSongPicker() {
    if (!state.activePlaylistId) return;
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (!pl) return;
    songPickerSelected.clear();
    songPickerSearch.value = '';
    renderSongPickerList(state.playlist, pl);
    songPickerModal.classList.remove('hidden');
    setTimeout(() => songPickerSearch.focus(), 60);
}

function renderSongPickerList(songs, pl) {
    const term = songPickerSearch.value.trim().toLowerCase();
    const filtered = term
        ? songs.filter(s =>
            s.title.toLowerCase().includes(term) ||
            s.artist.toLowerCase().includes(term) ||
            (s.album && s.album.toLowerCase().includes(term)))
        : songs;

    songPickerList.innerHTML = '';
    if (filtered.length === 0) {
        songPickerList.innerHTML = `<li style="padding:20px;color:var(--text-muted);text-align:center;">No songs match</li>`;
        return;
    }
    filtered.forEach(song => {
        const alreadyIn = pl.songs.includes(song.path);
        const isChecked = songPickerSelected.has(song.path);
        const li = document.createElement('li');
        li.className = 'song-row picker-row' + (alreadyIn ? ' picker-already-in' : '');
        li.dataset.path = song.path;
        const artSrc = song.picture || '';
        const defaultArt = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`;
        li.innerHTML = `
            <span class="picker-check ${isChecked ? 'checked' : ''} ${alreadyIn ? 'disabled' : ''}">
                ${alreadyIn
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 6L9 17l-5-5"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="${isChecked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="3"/>${isChecked ? '<path d="M7 12l4 4 6-6" fill="none" stroke="#fff" stroke-width="2"/>' : ''}</svg>`
            }
            </span>
            ${artSrc
                ? `<img src="${artSrc}" class="song-art-small" alt="">`
                : `<div class="song-art-small" style="display:flex;align-items:center;justify-content:center;color:var(--text-dim);width:40px;height:40px;">${defaultArt}</div>`
            }
            <div class="song-info">
                <span class="song-title">${escapeHtml(song.title)}</span>
                <span class="song-meta">${escapeHtml(song.artist)}${song.album ? ' • ' + escapeHtml(song.album) : ''}</span>
            </div>
            <span class="song-duration">${song.duration ? formatTime(song.duration) : ''}</span>
            ${alreadyIn ? '<span style="font-size:0.75rem;color:var(--text-dim);padding:0 8px;">Already added</span>' : ''}
        `;

        li.querySelectorAll('img.song-art-small').forEach(img => {
            img.addEventListener('error', () => {
                const div = document.createElement('div');
                div.className = 'song-art-small';
                div.style.cssText = 'display:flex;align-items:center;justify-content:center;color:var(--text-dim);width:40px;height:40px;';
                div.innerHTML = defaultArt;
                img.replaceWith(div);
            });
        });

        if (!alreadyIn) {
            li.addEventListener('click', () => {
                if (songPickerSelected.has(song.path)) {
                    songPickerSelected.delete(song.path);
                } else {
                    songPickerSelected.add(song.path);
                }
                updateSongPickerCount();
                renderSongPickerList(state.playlist, pl);
            });
        }
        songPickerList.appendChild(li);
    });
    updateSongPickerCount();
}

function updateSongPickerCount() {
    const n = songPickerSelected.size;
    songPickerSelectedCount.textContent = n === 0 ? '0 selected' : `${n} song${n !== 1 ? 's' : ''} selected`;
    confirmSongPickerBtn.disabled = n === 0;
    confirmSongPickerBtn.style.opacity = n === 0 ? '0.5' : '1';
}

addSongsToPlaylistBtn.addEventListener('click', openSongPicker);

songPickerSearch.addEventListener('input', () => {
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (pl) renderSongPickerList(state.playlist, pl);
});

function closeSongPicker() {
    songPickerModal.classList.add('hidden');
    songPickerSelected.clear();
}

closeSongPickerBtn.addEventListener('click', closeSongPicker);
cancelSongPickerBtn.addEventListener('click', closeSongPicker);
songPickerModal.addEventListener('click', (e) => { if (e.target === songPickerModal) closeSongPicker(); });

confirmSongPickerBtn.addEventListener('click', () => {
    if (!state.activePlaylistId || songPickerSelected.size === 0) return;
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (!pl) return;
    let added = 0;
    songPickerSelected.forEach(path => {
        if (!pl.songs.includes(path)) { pl.songs.push(path); added++; }
    });
    savePlaylists();
    renderPlaylistsNav();
    openPlaylistView(state.activePlaylistId);
    closeSongPicker();
    showToast(`✓ Added ${added} song${added !== 1 ? 's' : ''} to "${pl.name}"`);
});

// ===================== DELETE PLAYLIST =====================
newPlaylistBtn.addEventListener('click', () => {
    newPlaylistNameInput.value = '';
    createPlaylistModal.classList.remove('hidden');
    setTimeout(() => newPlaylistNameInput.focus(), 50);
});

closeCreatePlaylistBtn.addEventListener('click', () => createPlaylistModal.classList.add('hidden'));
cancelCreatePlaylistBtn.addEventListener('click', () => createPlaylistModal.classList.add('hidden'));

confirmCreatePlaylistBtn.addEventListener('click', () => {
    const name = newPlaylistNameInput.value.trim();
    if (!name) return;
    createPlaylist(name);
    createPlaylistModal.classList.add('hidden');
});

newPlaylistNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmCreatePlaylistBtn.click();
    if (e.key === 'Escape') createPlaylistModal.classList.add('hidden');
});

deletePlaylistBtn.addEventListener('click', () => {
    if (!state.activePlaylistId) return;
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (!pl) return;
    if (!confirm(`Delete state.playlist "${pl.name}"?`)) return;
    state.playlists = state.playlists.filter(p => p.id !== state.activePlaylistId);
    savePlaylists();
    renderPlaylistsNav();
    state.activePlaylistId = null;
    switchView('library');
    showToast('Playlist deleted');
});

// ===================== CONTEXT MENU =====================
let contextTargetPlaylistId = null;

function showContextMenu(e, index, fromPlaylistId = null) {
    state.contextTargetIndex = index;
    state.playQueueContext = Array.from(e.currentTarget.parentElement.querySelectorAll('.song-row')).map(r => parseInt(r.dataset.index));
    contextTargetPlaylistId = fromPlaylistId;
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 240);
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
    ctxPlaylistSubmenu.classList.add('hidden');

    const isFav = state.favorites.includes(state.playlist[index]?.path);
    ctxFav.textContent = isFav ? '♥ Remove from Favorites' : '♡ Add to Favorites';

    // Show "Remove from Playlist" only when right-clicking inside a state.playlist
    const inPlaylist = !!fromPlaylistId;
    ctxRemovePlaylist.classList.toggle('hidden', !inPlaylist);
}

document.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
    ctxPlaylistSubmenu.classList.add('hidden');
    contextTargetVideoPath = null;
    
    // Reset context menu items visibility for songs
    ctxPlay.classList.remove('hidden');
    ctxFav.classList.remove('hidden');
    ctxAddPlaylist.classList.remove('hidden');
});

contextMenu.addEventListener('click', (e) => e.stopPropagation());

ctxPlay.addEventListener('click', () => {
    if (state.contextTargetIndex >= 0) playSong(state.contextTargetIndex);
    contextMenu.classList.add('hidden');
});

ctxFav.addEventListener('click', () => {
    if (state.contextTargetIndex < 0) return;
    const path = state.playlist[state.contextTargetIndex]?.path;
    if (path) {
        const isFavNow = !state.favorites.includes(path);
        toggleFavorite(path);
        syncFavIconsForPath(path, isFavNow);
    }
    contextMenu.classList.add('hidden');
});

ctxRemovePlaylist.addEventListener('click', () => {
    if (state.contextTargetIndex < 0 || !contextTargetPlaylistId) return;
    const pl = state.playlists.find(p => p.id === contextTargetPlaylistId);
    if (!pl) return;
    const songPath = state.playlist[state.contextTargetIndex]?.path;
    if (!songPath) return;
    pl.songs = pl.songs.filter(p => p !== songPath);
    savePlaylists();
    renderPlaylistsNav();
    openPlaylistView(contextTargetPlaylistId);
    contextMenu.classList.add('hidden');
    showToast('Removed from playlist');
});

let submenuHideTimer = null;

function scheduleHideSubmenu() {
    submenuHideTimer = setTimeout(() => {
        ctxPlaylistSubmenu.classList.add('hidden');
    }, 200);
}

function cancelHideSubmenu() {
    clearTimeout(submenuHideTimer);
}

ctxAddPlaylist.addEventListener('mouseenter', () => {
    cancelHideSubmenu();
    if (state.playlists.length === 0) {
        ctxPlaylistSubmenu.innerHTML = `<div class="ctx-item" style="opacity:0.5;cursor:default">No playlists yet — create one first</div>`;
    } else {
        ctxPlaylistSubmenu.innerHTML = '';
        state.playlists.forEach(pl => {
            const item = document.createElement('div');
            item.className = 'ctx-item';
            item.textContent = pl.name;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (state.contextTargetIndex >= 0) {
                    addSongToPlaylist(pl.id, state.playlist[state.contextTargetIndex].path);
                }
                contextMenu.classList.add('hidden');
                ctxPlaylistSubmenu.classList.add('hidden');
            });
            ctxPlaylistSubmenu.appendChild(item);
        });
    }
    // Position: overlap by 4px so there's no gap the mouse can slip through
    ctxPlaylistSubmenu.style.top = '0';
    ctxPlaylistSubmenu.style.left = (contextMenu.offsetWidth - 4) + 'px';
    ctxPlaylistSubmenu.classList.remove('hidden');
});

ctxAddPlaylist.addEventListener('mouseleave', scheduleHideSubmenu);

ctxPlaylistSubmenu.addEventListener('mouseenter', cancelHideSubmenu);
ctxPlaylistSubmenu.addEventListener('mouseleave', scheduleHideSubmenu);

// ===================== FILE OPERATIONS =====================
ctxReveal.addEventListener('click', () => {
    if (state.contextTargetIndex < 0) return;
    const songPath = state.playlist[state.contextTargetIndex]?.path;
    if (songPath) electronAPI.revealInFolder(songPath);
    contextMenu.classList.add('hidden');
});

// ===================== VIDEO CONTEXT MENU =====================
let contextTargetVideoPath = null;

function showVideoContextMenu(e, video, index) {
    contextTargetVideoPath = video.path;
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
    
    // Hide song-specific options
    ctxPlay.classList.add('hidden');
    ctxFav.classList.add('hidden');
    ctxAddPlaylist.classList.add('hidden');
    ctxRemovePlaylist.classList.add('hidden');
    
    // Show file operations
    ctxReveal.classList.remove('hidden');
    ctxRename.classList.remove('hidden');
    ctxDelete.classList.remove('hidden');
}

ctxReveal.addEventListener('click', () => {
    // Handle video reveal
    if (contextTargetVideoPath) {
        electronAPI.revealInFolder(contextTargetVideoPath);
        contextMenu.classList.add('hidden');
        return;
    }
    
    // Handle song reveal
    if (state.contextTargetIndex < 0) return;
    const songPath = state.playlist[state.contextTargetIndex]?.path;
    if (songPath) electronAPI.revealInFolder(songPath);
    contextMenu.classList.add('hidden');
});

ctxDelete.addEventListener('click', async () => {
    // Handle video deletion
    if (contextTargetVideoPath) {
        if (confirm(`Are you sure you want to delete this video? This action sends it to your trash bin.`)) {
            const res = await electronAPI.deleteFile(contextTargetVideoPath);
            if (res.success) {
                showToast('Video deleted successfully');
                // Remove from playlist
                const videoIndex = state.playlist.findIndex(item => item.path === contextTargetVideoPath);
                if (videoIndex >= 0) {
                    state.playlist.splice(videoIndex, 1);
                }
                contextTargetVideoPath = null;
                
                // Refresh videos view
                if (state.currentView === 'videos') {
                    renderVideosView();
                }
            } else {
                showToast('Failed to delete video: ' + res.error);
            }
        }
        contextMenu.classList.add('hidden');
        return;
    }
    
    // Handle song deletion
    if (state.contextTargetIndex < 0) return;
    const songPath = state.playlist[state.contextTargetIndex]?.path;
    if (songPath) {
        if (confirm(`Are you sure you want to delete this file? This action sends it to your trash bin.`)) {
            const res = await electronAPI.deleteFile(songPath);
            if (res.success) {
                showToast('File deleted successfully');
                // Remove from local memory
                state.playlist.splice(state.contextTargetIndex, 1);
                state.favorites = state.favorites.filter(p => p !== songPath);
                saveFavorites();
                state.playlists.forEach(pl => {
                    pl.songs = pl.songs.filter(p => p !== songPath);
                });
                savePlaylists();
                updateLibraryCount();
                // We re-render the current view
                if (state.currentView === 'library') renderLibraryView();
                else if (state.currentView === 'favorites') renderFavoritesView();
                else if (state.currentView === 'playlist-single') openPlaylistView(contextTargetPlaylistId);
            } else {
                showToast('Failed to delete file: ' + res.error);
            }
        }
    }
    contextMenu.classList.add('hidden');
});

let renamingSongPath = null;
ctxRename.addEventListener('click', () => {
    // Handle video rename
    if (contextTargetVideoPath) {
        renamingSongPath = contextTargetVideoPath;
        const filename = contextTargetVideoPath.substring(Math.max(contextTargetVideoPath.lastIndexOf('\\'), contextTargetVideoPath.lastIndexOf('/')) + 1);
        renameInput.value = filename.substring(0, filename.lastIndexOf('.')) || filename;
        renameModal.classList.remove('hidden');
        renameInput.focus();
        contextMenu.classList.add('hidden');
        return;
    }
    
    // Handle song rename
    if (state.contextTargetIndex < 0) return;
    const song = state.playlist[state.contextTargetIndex];
    if (song) {
        renamingSongPath = song.path;
        // The filename without extension usually represents its raw physical name
        const filename = song.path.substring(Math.max(song.path.lastIndexOf('\\'), song.path.lastIndexOf('/')) + 1);
        renameInput.value = filename.substring(0, filename.lastIndexOf('.')) || filename;
        renameModal.classList.remove('hidden');
        renameInput.focus();
    }
    contextMenu.classList.add('hidden');
});

function closeRenameModal() {
    renameModal.classList.add('hidden');
    renameInput.value = '';
    renamingSongPath = null;
    contextTargetVideoPath = null;
}

closeRenameBtn.addEventListener('click', closeRenameModal);
cancelRenameBtn.addEventListener('click', closeRenameModal);

confirmRenameBtn.addEventListener('click', async () => {
    const newName = renameInput.value.trim();
    if (!newName || !renamingSongPath) return;

    const res = await electronAPI.renameFile(renamingSongPath, newName);
    if (!res.success) {
        showToast('Failed to rename file: ' + res.error);
        return;
    }

    // Success, update current states with the newPath
    const songIndex = state.playlist.findIndex(s => s.path === renamingSongPath);
    if (songIndex > -1) {
        state.playlist[songIndex].path = res.newPath;
        state.playlist[songIndex].title = newName; // We could re-parse metadata, but here we just update title natively
    }

    const favIdx = state.favorites.indexOf(renamingSongPath);
    if (favIdx > -1) {
        state.favorites[favIdx] = res.newPath;
        saveFavorites();
    }

    let plChanged = false;
    state.playlists.forEach(pl => {
        const pIdx = pl.songs.indexOf(renamingSongPath);
        if (pIdx > -1) {
            pl.songs[pIdx] = res.newPath;
            plChanged = true;
        }
    });
    if (plChanged) savePlaylists();

    showToast('File renamed');
    closeRenameModal();

    // Refresh UI
    if (state.currentView === 'library') renderLibraryView();
    else if (state.currentView === 'favorites') renderFavoritesView();
    else if (state.currentView === 'playlist-single') openPlaylistView(contextTargetPlaylistId);
    else if (state.currentView === 'videos') renderVideosView();
});

renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmRenameBtn.click();
    if (e.key === 'Escape') closeRenameModal();
});

// ===================== SEARCH =====================
searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();

    if (!term) {
        searchHint.classList.remove('hidden');
        searchResults.classList.add('hidden');
        searchResults.innerHTML = '';
        return;
    }

    const matches = state.playlist.filter(s =>
        s.title.toLowerCase().includes(term) ||
        s.artist.toLowerCase().includes(term) ||
        (s.album && s.album.toLowerCase().includes(term))
    );

    searchHint.classList.add('hidden');
    searchResults.classList.remove('hidden');
    searchResults.innerHTML = '';

    if (matches.length === 0) {
        searchResults.innerHTML = `<li style="padding:24px;color:var(--text-muted);text-align:center;">No results for "${escapeHtml(searchInput.value)}"</li>`;
        return;
    }

    matches.forEach(song => {
        const realIndex = state.playlist.indexOf(song);
        renderSongRow(song, realIndex, searchResults);
    });
});

// Clear search when leaving search view
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
        if (item.dataset.view !== 'search') {
            searchInput.value = '';
            searchHint.classList.remove('hidden');
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
        }
    });
});




