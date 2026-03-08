// ============================================================
// LUMORA MUSIC PLAYER — renderer.js
// Open Source Desktop MP3 Player
// ============================================================

// ===================== STATE =====================





import { addFolderBtn, addFolderBtn2, refreshLibraryBtn, refreshVideosBtn, playlistEl, loadingIndicator, libraryCount, playbackControls, playPauseBtn, playIcon, pauseIcon, prevBtn, nextBtn, shuffleBtn, repeatBtn, seekBar, timeCurrent, timeTotal, volumeBar, muteBtn, volIconOn, volIconOff, trackTitle, trackArtist, trackArt, artPlaceholder, eqBars, bgBlur, playerFavBtn, favCountBadge, favCountText, favoritesList, favoritesEmpty, searchInput, librarySearch, favoritesSearch, videosSearch, searchResults, searchHint, playlistsNavList, newPlaylistBtn, folderList, settingsBtn, settingsModal, closeSettingsBtn, createPlaylistModal, closeCreatePlaylistBtn, cancelCreatePlaylistBtn, confirmCreatePlaylistBtn, newPlaylistNameInput, contextMenu, ctxPlay, ctxFav, ctxAddPlaylist, ctxPlaylistSubmenu, ctxRemovePlaylist, ctxReveal, ctxRename, ctxDelete, renameModal, closeRenameBtn, cancelRenameBtn, confirmRenameBtn, renameInput, renamePlaylistBtn, renamePlaylistModal, closeRenamePlaylistBtn, cancelRenamePlaylistBtn, confirmRenamePlaylistBtn, renamePlaylistInput, deletePlaylistBtn, playlistViewName, playlistViewCount, playlistViewSongs, playlistEmpty, addSongsToPlaylistBtn, songPickerModal, closeSongPickerBtn, cancelSongPickerBtn, confirmSongPickerBtn, songPickerSearch, songPickerList, songPickerSelectedCount, toast, colorPicker, bgColorPicker, panelColorPicker, glassOpacity, opacityVal, blurIntensity, blurVal, fontSelect, resetSettingsBtn, bgImageBtn, clearBgImageBtn, fontDropdown, fontDropdownTrigger, fontDropdownMenu, fontDropdownLabel, canvas, mobileMenuBtn, sidebar, sidebarOverlay, videoPlayerContainer, videoPlayer, closeVideoBtn, videosList, videosCount, videosEmpty, videoCountBadge, videoPlayerMain, mainVideoPlayer, currentVideoTitle, loadSubtitleBtn, closeVideoPlayerBtn, librarySortBtn, librarySortLabel, librarySortMenu, videosSortBtn, videosSortLabel, videosSortMenu, prevVideoBtn, nextVideoBtn, videoQualityBadge,
    librarySelectionToolbar, librarySelectionCount, librarySelectAllBtn, libraryDeselectBtn, libraryPlaySelectedBtn, libraryDeleteSelectedBtn,
    favoritesSelectionToolbar, favoritesSelectionCount, favoritesSelectAllBtn, favoritesDeselectBtn, favoritesPlaySelectedBtn, favoritesDeleteSelectedBtn,
    videosSelectionToolbar, videosSelectionCount, videosSelectAllBtn, videosDeselectBtn, videosDeleteSelectedBtn,
    ctxSelect, ctxSelectAll, ctxBulkHeader, ctxBulkPlay, ctxBulkFav, ctxBulkPlaylist, ctxBulkPlaylistSubmenu, ctxBulkDeselect, ctxBulkDelete,
    libraryAddPlaylistBtn, favoritesAddPlaylistBtn,
    weeklyReportModal, closeWeeklyReportBtn, reportPeriod, reportTotalPlays, reportTotalTime, reportUniqueSongs, reportUniqueArtists, reportTopSongs, reportTopArtists, reportTopGenres, reportDailyChart, reportEmpty, debugWeeklyReportBtn
} from './js/ui/dom.js';
import { state, loadState, saveFavorites, savePlaylists, saveFolders, saveLastTrack, getLastTrack, saveLastTrackTime, getLastTrackTime, getPlayHistory, getLastReportDate, saveLastReportDate } from './js/core/state.js';
import { escapeHtml, showToast, formatTime } from './js/core/utils.js';
import { initSettings, setAppWallpaper } from './js/ui/settings.js';
import { initAudio, playSong, togglePlay, nextSong, prevSong, audio } from './js/core/audio.js';
import { initPlayerEnhancements, animateTrackChange, updateArtGlow } from './js/ui/player-enhancements.js';

// Thumbnail generation queue to limit concurrent video loading
let thumbnailQueue = [];
let activeThumbnailGenerations = 0;
const MAX_CONCURRENT_THUMBNAILS = 3;


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
    
    // Load state from electron-store first
    await loadState();
    
    // Critical path - do this first for fast initial render
    initSettings();
    initSortUI();
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
                await saveFolders();
                renderFolderList();
                showToast('🎵 Scanning your Music and Downloads folders...');
                await scanFolders(defaultDirs);
            }
        }

        // Restore last played track after initial render
        await restoreLastTrack();
        
        // Check if weekly report should auto-show
        await checkWeeklyReportAutoShow();
        
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
async function restoreLastTrack() {
    const lastTrackPath = await getLastTrack();
    const lastTrackTime = await getLastTrackTime();
    
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

    // Exit selection mode when navigating to a different view
    if (state.selectionMode) exitSelectionMode();

    // Clear search inputs
    librarySearch.value = '';
    favoritesSearch.value = '';
    videosSearch.value = '';

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
let currentLibrarySort = localStorage.getItem('lumora-library-sort') || 'title';
let currentVideosSort = localStorage.getItem('lumora-videos-sort') || 'title';
let currentLibrarySortDir = localStorage.getItem('lumora-library-sort-dir') || 'asc';
let currentVideosSortDir = localStorage.getItem('lumora-videos-sort-dir') || 'asc';

function sortItems(items, sortBy, direction = 'asc') {
    const sorted = [...items];
    
    // Random doesn't respect direction
    if (sortBy === 'random') {
        for (let i = sorted.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
        }
        return sorted;
    }
    
    const dir = direction === 'desc' ? -1 : 1;
    
    switch (sortBy) {
        case 'title':
            sorted.sort((a, b) => dir * (a.title || '').localeCompare(b.title || ''));
            break;
        case 'artist':
            sorted.sort((a, b) => dir * (a.artist || '').localeCompare(b.artist || ''));
            break;
        case 'album':
            sorted.sort((a, b) => dir * (a.album || '').localeCompare(b.album || ''));
            break;
        case 'genre':
            sorted.sort((a, b) => {
                const gA = (Array.isArray(a.genre) ? a.genre.join(', ') : (a.genre || ''));
                const gB = (Array.isArray(b.genre) ? b.genre.join(', ') : (b.genre || ''));
                return dir * gA.localeCompare(gB);
            });
            break;
        case 'duration':
            sorted.sort((a, b) => dir * ((a.duration || 0) - (b.duration || 0)));
            break;
        case 'fileName':
            sorted.sort((a, b) => {
                const nameA = (a.path ? a.path.split('/').pop().split('\\').pop() : '').toLowerCase();
                const nameB = (b.path ? b.path.split('/').pop().split('\\').pop() : '').toLowerCase();
                return dir * nameA.localeCompare(nameB);
            });
            break;
        case 'dateAdded':
            if (direction === 'desc') {
                sorted.reverse();
            }
            // asc = original order (oldest first), desc = reversed (newest first)
            break;
        default:
            break;
    }
    return sorted;
}

function updateSortLabel(label, sortBy, direction) {
    const labels = {
        title: 'Title',
        artist: 'Artist',
        album: 'Album',
        genre: 'Genre',
        duration: 'Duration',
        fileName: 'File Name',
        dateAdded: 'Date Added',
        random: 'Random'
    };
    const dirArrow = sortBy === 'random' ? '' : (direction === 'desc' ? ' ↓' : ' ↑');
    label.textContent = (labels[sortBy] || 'Title') + dirArrow;
}

function updateSortDirButtons(container, direction) {
    if (!container) return;
    container.querySelectorAll('.sort-dir-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dir === direction);
    });
}

// Initialize sort UI on page load
function initSortUI() {
    // Update library sort label and menu
    updateSortLabel(librarySortLabel, currentLibrarySort, currentLibrarySortDir);
    librarySortMenu.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.sort === currentLibrarySort);
    });
    updateSortDirButtons(document.getElementById('library-sort-dir'), currentLibrarySortDir);
    
    // Update videos sort label and menu
    updateSortLabel(videosSortLabel, currentVideosSort, currentVideosSortDir);
    videosSortMenu.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.sort === currentVideosSort);
    });
    updateSortDirButtons(document.getElementById('videos-sort-dir'), currentVideosSortDir);
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
    // Handle sort option click
    if (e.target.classList.contains('sort-option')) {
        currentLibrarySort = e.target.dataset.sort;
        localStorage.setItem('lumora-library-sort', currentLibrarySort);
        librarySortBtn.parentElement.classList.remove('open');
        librarySortMenu.classList.add('hidden');
        renderLibraryView();
    }
    // Handle sort direction button click
    if (e.target.closest('.sort-dir-btn')) {
        const btn = e.target.closest('.sort-dir-btn');
        currentLibrarySortDir = btn.dataset.dir;
        localStorage.setItem('lumora-library-sort-dir', currentLibrarySortDir);
        updateSortDirButtons(document.getElementById('library-sort-dir'), currentLibrarySortDir);
        renderLibraryView();
    }
    e.stopPropagation();
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
        localStorage.setItem('lumora-videos-sort', currentVideosSort);
        videosSortBtn.parentElement.classList.remove('open');
        videosSortMenu.classList.add('hidden');
        renderVideosView();
    }
    if (e.target.closest('.sort-dir-btn')) {
        const btn = e.target.closest('.sort-dir-btn');
        currentVideosSortDir = btn.dataset.dir;
        localStorage.setItem('lumora-videos-sort-dir', currentVideosSortDir);
        updateSortDirButtons(document.getElementById('videos-sort-dir'), currentVideosSortDir);
        renderVideosView();
    }
    e.stopPropagation();
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

addFolderBtn2.addEventListener('click', doAddFolder);

// Refresh library and videos
async function refreshLibrary() {
    if (state.scannedFolders.length === 0) {
        showToast('No folders to scan. Add a folder first.');
        return;
    }
    showToast('🔄 Refreshing library...');
    await scanFolders(state.scannedFolders);
    showToast('✓ Library refreshed!');
}

refreshLibraryBtn.addEventListener('click', refreshLibrary);
refreshVideosBtn.addEventListener('click', refreshLibrary);

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
            }
        }
        updateLibraryCount();
        updateVideoCount();
        loadingIndicator.classList.add('hidden');
        
        // Re-render views with proper sorting after scan completes
        if (state.currentView === 'library') {
            renderLibraryView();
        } else if (state.currentView === 'videos') {
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
}

function renderLibraryView(searchTerm = '') {
    playlistEl.innerHTML = '';
    // Filter out videos - only show audio files in library
    let audioFiles = state.playlist.filter(item => !isVideoFile(item.path));
    
    // Apply search filter if term is provided
    if (searchTerm) {
        audioFiles = audioFiles.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.artist.toLowerCase().includes(searchTerm) ||
            (item.album && item.album.toLowerCase().includes(searchTerm))
        );
    }
    
    // Sort audio files
    const sorted = sortItems(audioFiles, currentLibrarySort, currentLibrarySortDir);
    
    // Pre-compute the sorted play queue (original indices in sorted order)
    const sortedPlayQueue = sorted.map(song => state.playlist.indexOf(song));
    
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
            const li = createSongRowElement(song, originalIndex, playlistEl, null, sortedPlayQueue);
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
    
    // Restore selection-mode class if active
    if (state.selectionMode) {
        playlistEl.classList.add('selection-mode');
        updateSelectionToolbarForCurrentView();
    }

    updateLibraryCount();
    updateSortLabel(librarySortLabel, currentLibrarySort, currentLibrarySortDir);
    
    // Update selected state in menu
    librarySortMenu.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.sort === currentLibrarySort);
    });
    updateSortDirButtons(document.getElementById('library-sort-dir'), currentLibrarySortDir);
}

// Helper to check if file is video
function isVideoFile(path) {
    return path && /\.(mp4|webm|ogg|mkv|mov|avi)$/i.test(path);
}

// ===================== SONG ROW RENDERER =====================
// Create song row element without immediately appending (for batch rendering)
function createSongRowElement(item, index, container, fromPlaylistId = null, sortedPlayQueue = null) {
    const li = document.createElement('li');
    li.className = 'song-row';
    li.dataset.index = index;
    li.dataset.path = item.path;

    const isFav = state.favorites.includes(item.path);
    const artSrc = item.picture || '';
    const defaultArt = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`;

    const isSelected = state.selectedItems.has(item.path);

    li.innerHTML = `
        <span class="sel-checkbox${isSelected ? ' checked' : ''}"></span>
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

    if (isSelected) li.classList.add('selected');

    li.querySelectorAll('img.song-art-small').forEach(img => {
        img.addEventListener('error', () => {
            const div = document.createElement('div');
            div.className = 'song-art-small';
            div.style.cssText = 'display:flex;align-items:center;justify-content:center;color:var(--text-dim);width:40px;height:40px;';
            div.innerHTML = defaultArt;
            img.replaceWith(div);
        }, { once: true });
    });

    // Click to play or toggle selection
    li.addEventListener('click', (e) => {
        if (e.target.closest('.song-fav-btn')) return;

        if (state.selectionMode) {
            // Toggle selection
            toggleItemSelection(item.path);
            updateSelectionToolbarForCurrentView();
            return;
        }

        // Long press or Ctrl/Shift to enter selection mode
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            enterSelectionMode(li.parentElement);
            toggleItemSelection(item.path);
            updateSelectionToolbarForCurrentView();
            return;
        }

        // Use pre-computed sorted queue if available, otherwise read from DOM order
        if (sortedPlayQueue && sortedPlayQueue.length > 0) {
            state.playQueueContext = sortedPlayQueue;
        } else {
            state.playQueueContext = Array.from(e.currentTarget.parentElement.querySelectorAll('.song-row')).map(r => parseInt(r.dataset.index));
        }
        playSong(index);
    });

    // Fav button inside song row
    li.querySelector('.song-fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const isFavNow = !state.favorites.includes(item.path);
        toggleFavorite(item.path);
        const btn = e.currentTarget;
        btn.classList.toggle('active', isFavNow);
        btn.title = isFavNow ? 'Remove from Favorites' : 'Add to Favorites';
        const svg = btn.querySelector('svg');
        svg.setAttribute('fill', isFavNow ? 'currentColor' : 'none');
        svg.setAttribute('stroke', isFavNow ? 'var(--primary)' : 'currentColor');
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

function renderFavoritesView(searchTerm = '') {
    favoritesList.innerHTML = '';
    // state.favorites is a list of file paths; find matching songs in library
    let favSongs = state.favorites
        .map(path => state.playlist.find(s => s.path === path))
        .filter(Boolean);  // ignore any saved paths no longer in library

    // Apply search filter if term is provided
    if (searchTerm) {
        favSongs = favSongs.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.artist.toLowerCase().includes(searchTerm) ||
            (item.album && item.album.toLowerCase().includes(searchTerm))
        );
    }

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
function renderVideosView(searchTerm = '') {
    videosList.innerHTML = '';
    let videoFiles = state.playlist.filter(item => isVideoFile(item.path));
    
    // Apply search filter if term is provided
    if (searchTerm) {
        videoFiles = videoFiles.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            (item.artist && item.artist.toLowerCase().includes(searchTerm))
        );
    }
    
    updateVideoCount();
    
    if (videoFiles.length === 0) {
        videosEmpty.classList.remove('hidden');
        updateSortLabel(videosSortLabel, currentVideosSort, currentVideosSortDir);
        videosSortMenu.querySelectorAll('.sort-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.sort === currentVideosSort);
        });
        updateSortDirButtons(document.getElementById('videos-sort-dir'), currentVideosSortDir);
        return;
    }
    
    videosEmpty.classList.add('hidden');
    
    // Sort video files
    const sorted = sortItems(videoFiles, currentVideosSort, currentVideosSortDir);
    
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
    
    updateSortLabel(videosSortLabel, currentVideosSort, currentVideosSortDir);
    
    // Update selected state in menu
    videosSortMenu.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.sort === currentVideosSort);
    });
    updateSortDirButtons(document.getElementById('videos-sort-dir'), currentVideosSortDir);
}

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
    
    // Selection checkbox badge (top-left of thumbnail)
    const selChk = document.createElement('span');
    selChk.className = 'video-sel-checkbox' + (state.selectedItems.has(video.path) ? ' checked' : '');
    thumbnailDiv.appendChild(selChk);

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
    
    li.dataset.path = video.path;

    li.addEventListener('click', (e) => {
        if (state.selectionMode) {
            toggleItemSelection(video.path);
            updateSelectionToolbarForCurrentView();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            enterSelectionMode(videosList);
            toggleItemSelection(video.path);
            updateSelectionToolbarForCurrentView();
            return;
        }
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

deletePlaylistBtn.addEventListener('click', async () => {
    if (!state.activePlaylistId) return;
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (!pl) return;
    if (!confirm(`Delete playlist "${pl.name}"?`)) return;
    state.playlists = state.playlists.filter(p => p.id !== state.activePlaylistId);
    await savePlaylists();
    renderPlaylistsNav();
    state.activePlaylistId = null;
    switchView('library');
    showToast('Playlist deleted');
});

// Rename Playlist
renamePlaylistBtn.addEventListener('click', () => {
    if (!state.activePlaylistId) return;
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (!pl) return;
    renamePlaylistInput.value = pl.name;
    renamePlaylistModal.classList.remove('hidden');
    setTimeout(() => renamePlaylistInput.select(), 100);
});

closeRenamePlaylistBtn.addEventListener('click', () => {
    renamePlaylistModal.classList.add('hidden');
});

cancelRenamePlaylistBtn.addEventListener('click', () => {
    renamePlaylistModal.classList.add('hidden');
});

confirmRenamePlaylistBtn.addEventListener('click', async () => {
    if (!state.activePlaylistId) return;
    const newName = renamePlaylistInput.value.trim();
    if (!newName) {
        showToast('Playlist name cannot be empty');
        return;
    }
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (!pl) return;
    pl.name = newName;
    await savePlaylists();
    renderPlaylistsNav();
    openPlaylistView(state.activePlaylistId);
    renamePlaylistModal.classList.add('hidden');
    showToast('Playlist renamed');
});

renamePlaylistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmRenamePlaylistBtn.click();
    if (e.key === 'Escape') renamePlaylistModal.classList.add('hidden');
});

// ===================== CONTEXT MENU =====================
let contextTargetPlaylistId = null;

/**
 * Helper: hide all bulk action items in context menu
 */
function hideBulkContextItems() {
    ctxBulkHeader.classList.add('hidden');
    ctxBulkPlay.classList.add('hidden');
    ctxBulkFav.classList.add('hidden');
    ctxBulkPlaylist.classList.add('hidden');
    ctxBulkPlaylistSubmenu.classList.add('hidden');
    ctxBulkDeselect.classList.add('hidden');
    ctxBulkDelete.classList.add('hidden');
    // Hide bulk separators
    contextMenu.querySelectorAll('.ctx-bulk-sep').forEach(el => el.classList.add('hidden'));
}

/**
 * Helper: hide all single-item action items
 */
function hideSingleContextItems() {
    ctxPlay.classList.add('hidden');
    ctxFav.classList.add('hidden');
    ctxAddPlaylist.classList.add('hidden');
    ctxRemovePlaylist.classList.add('hidden');
    ctxReveal.classList.add('hidden');
    ctxRename.classList.add('hidden');
    ctxDelete.classList.add('hidden');
    ctxPlaylistSubmenu.classList.add('hidden');
    // Hide single separators
    contextMenu.querySelectorAll('.ctx-single-sep').forEach(el => el.classList.add('hidden'));
}

/**
 * Show bulk action items when multiple items are selected
 */
function showBulkContextItems(isVideoView) {
    const count = state.selectedItems.size;
    ctxBulkHeader.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
    ctxBulkHeader.classList.remove('hidden');
    
    if (!isVideoView) {
        ctxBulkPlay.classList.remove('hidden');
        ctxBulkFav.classList.remove('hidden');
        ctxBulkPlaylist.classList.remove('hidden');
    }
    
    ctxBulkDeselect.classList.remove('hidden');
    ctxBulkDelete.classList.remove('hidden');
    contextMenu.querySelectorAll('.ctx-bulk-sep').forEach(el => el.classList.remove('hidden'));
}

// Store the path of the right-clicked item so "Select" knows what to select
let contextRightClickPath = null;
let contextRightClickListEl = null;

function showContextMenu(e, index, fromPlaylistId = null) {
    state.contextTargetIndex = index;
    state.playQueueContext = Array.from(e.currentTarget.parentElement.querySelectorAll('.song-row')).map(r => parseInt(r.dataset.index));
    contextTargetPlaylistId = fromPlaylistId;
    contextTargetVideoPath = null;
    
    const itemPath = state.playlist[index]?.path;
    contextRightClickPath = itemPath;
    contextRightClickListEl = e.currentTarget.parentElement;
    
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
    ctxPlaylistSubmenu.classList.add('hidden');
    
    // Reset all items
    hideBulkContextItems();
    hideSingleContextItems();

    if (state.selectionMode && state.selectedItems.size > 0) {
        // === BULK MODE: items are selected ===
        // Also select the right-clicked item if not already
        if (itemPath && !state.selectedItems.has(itemPath)) {
            toggleItemSelection(itemPath);
            updateSelectionToolbarForCurrentView();
        }
        showBulkContextItems(false);
        // Hide single select, show select all
        ctxSelect.classList.add('hidden');
        ctxSelectAll.classList.add('hidden');
    } else {
        // === SINGLE MODE: no selection, normal right-click ===
        const isFav = state.favorites.includes(itemPath);
        ctxFav.textContent = isFav ? '♥ Remove from Favorites' : '♡ Add to Favorites';

        const inPlaylist = !!fromPlaylistId;
        ctxRemovePlaylist.classList.toggle('hidden', !inPlaylist);
        
        // Show all single-item options
        ctxPlay.classList.remove('hidden');
        ctxFav.classList.remove('hidden');
        ctxAddPlaylist.classList.remove('hidden');
        ctxReveal.classList.remove('hidden');
        ctxRename.classList.remove('hidden');
        ctxDelete.classList.remove('hidden');
        contextMenu.querySelectorAll('.ctx-single-sep').forEach(el => el.classList.remove('hidden'));
        
        // Show Select / Select All
        ctxSelect.classList.remove('hidden');
        ctxSelectAll.classList.remove('hidden');
        ctxSelect.textContent = '☑ Select';
    }
}

document.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
    ctxPlaylistSubmenu.classList.add('hidden');
    ctxBulkPlaylistSubmenu.classList.add('hidden');
    contextTargetVideoPath = null;
    contextRightClickPath = null;
    contextRightClickListEl = null;
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
    contextRightClickPath = video.path;
    contextRightClickListEl = videosList;
    state.contextTargetIndex = -1;
    
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
    
    // Reset all items
    hideBulkContextItems();
    hideSingleContextItems();

    if (state.selectionMode && state.selectedItems.size > 0) {
        // === BULK MODE ===
        if (!state.selectedItems.has(video.path)) {
            toggleItemSelection(video.path);
            updateSelectionToolbarForCurrentView();
        }
        showBulkContextItems(true);
        ctxSelect.classList.add('hidden');
        ctxSelectAll.classList.add('hidden');
    } else {
        // === SINGLE MODE for video ===
        // Show file operations only
        ctxReveal.classList.remove('hidden');
        ctxRename.classList.remove('hidden');
        ctxDelete.classList.remove('hidden');
        contextMenu.querySelectorAll('.ctx-single-sep').forEach(el => el.classList.remove('hidden'));
        
        // Show Select / Select All
        ctxSelect.classList.remove('hidden');
        ctxSelectAll.classList.remove('hidden');
        ctxSelect.textContent = '☑ Select';
    }
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

// ===================== INLINE SEARCH FOR VIEWS =====================
// Library search
librarySearch.addEventListener('input', () => {
    const term = librarySearch.value.trim().toLowerCase();
    renderLibraryView(term);
});

// Favorites search
favoritesSearch.addEventListener('input', () => {
    const term = favoritesSearch.value.trim().toLowerCase();
    renderFavoritesView(term);
});

// Videos search
videosSearch.addEventListener('input', () => {
    const term = videosSearch.value.trim().toLowerCase();
    renderVideosView(term);
});

// ===================== SELECTION SYSTEM =====================

/**
 * Enter selection mode on a given list container (.song-list or .video-grid).
 * Adds the CSS class that reveals checkboxes.
 */
function enterSelectionMode(listEl) {
    state.selectionMode = true;
    if (listEl) listEl.classList.add('selection-mode');
}

/**
 * Exit selection mode completely — clear selections, hide toolbar.
 */
function exitSelectionMode() {
    state.selectionMode = false;
    state.selectedItems.clear();
    // Remove selection-mode from all lists
    document.querySelectorAll('.song-list, .video-grid').forEach(el => el.classList.remove('selection-mode'));
    // Deselect all visual states
    document.querySelectorAll('.song-row.selected').forEach(el => {
        el.classList.remove('selected');
        const chk = el.querySelector('.sel-checkbox');
        if (chk) chk.classList.remove('checked');
    });
    document.querySelectorAll('.video-item.selected').forEach(el => {
        el.classList.remove('selected');
        const chk = el.querySelector('.video-sel-checkbox');
        if (chk) chk.classList.remove('checked');
    });
    // Hide all toolbars
    [librarySelectionToolbar, favoritesSelectionToolbar, videosSelectionToolbar].forEach(tb => {
        if (tb) tb.classList.add('hidden');
    });
}

/**
 * Toggle a single item's selected state by path.
 */
function toggleItemSelection(path) {
    if (state.selectedItems.has(path)) {
        state.selectedItems.delete(path);
    } else {
        state.selectedItems.add(path);
    }
    // Update visual state for every row / card showing this path
    document.querySelectorAll(`.song-row[data-path="${CSS.escape(path)}"]`).forEach(row => {
        const sel = state.selectedItems.has(path);
        row.classList.toggle('selected', sel);
        const chk = row.querySelector('.sel-checkbox');
        if (chk) chk.classList.toggle('checked', sel);
    });
    document.querySelectorAll(`.video-item[data-path="${CSS.escape(path)}"]`).forEach(card => {
        const sel = state.selectedItems.has(path);
        card.classList.toggle('selected', sel);
        const chk = card.querySelector('.video-sel-checkbox');
        if (chk) chk.classList.toggle('checked', sel);
    });
    // If nothing left selected, exit selection mode
    if (state.selectedItems.size === 0) {
        exitSelectionMode();
    }
}

/**
 * Select ALL visible items in the given container.
 */
function selectAllInContainer(container) {
    if (!container) return;
    enterSelectionMode(container);
    container.querySelectorAll('.song-row[data-path]').forEach(row => {
        const path = row.dataset.path;
        state.selectedItems.add(path);
        row.classList.add('selected');
        const chk = row.querySelector('.sel-checkbox');
        if (chk) chk.classList.add('checked');
    });
    container.querySelectorAll('.video-item[data-path]').forEach(card => {
        const path = card.dataset.path;
        state.selectedItems.add(path);
        card.classList.add('selected');
        const chk = card.querySelector('.video-sel-checkbox');
        if (chk) chk.classList.add('checked');
    });
}

/**
 * Update the correct selection toolbar based on current view.
 */
function updateSelectionToolbarForCurrentView() {
    const count = state.selectedItems.size;

    // Always hide all first
    if (librarySelectionToolbar) librarySelectionToolbar.classList.add('hidden');
    if (favoritesSelectionToolbar) favoritesSelectionToolbar.classList.add('hidden');
    if (videosSelectionToolbar) videosSelectionToolbar.classList.add('hidden');

    if (count === 0) { exitSelectionMode(); return; }

    if (state.currentView === 'library') {
        if (librarySelectionToolbar) {
            librarySelectionCount.textContent = `${count} selected`;
            librarySelectionToolbar.classList.remove('hidden');
            playlistEl.classList.add('selection-mode');
        }
    } else if (state.currentView === 'favorites') {
        if (favoritesSelectionToolbar) {
            favoritesSelectionCount.textContent = `${count} selected`;
            favoritesSelectionToolbar.classList.remove('hidden');
            favoritesList.classList.add('selection-mode');
        }
    } else if (state.currentView === 'videos') {
        if (videosSelectionToolbar) {
            videosSelectionCount.textContent = `${count} selected`;
            videosSelectionToolbar.classList.remove('hidden');
            videosList.classList.add('selection-mode');
        }
    }
}

/**
 * Play all selected audio tracks as a temporary in-memory queue.
 */
function playSelectedSongs() {
    const selectedPaths = Array.from(state.selectedItems);
    const audioIndices = selectedPaths
        .filter(p => !isVideoFile(p))
        .map(p => state.playlist.findIndex(s => s.path === p))
        .filter(idx => idx !== -1);

    if (audioIndices.length === 0) {
        showToast('No audio tracks selected to play.');
        return;
    }

    // Build a temporary play queue (local variable — not persisted)
    const tempQueue = [...audioIndices];
    state.playQueueContext = tempQueue;
    playSong(tempQueue[0]);
    showToast(`▶ Playing ${tempQueue.length} selected track${tempQueue.length !== 1 ? 's' : ''}`);
    exitSelectionMode();
}

/**
 * Delete all selected items (songs or videos) permanently.
 */
async function deleteSelectedItems() {
    const count = state.selectedItems.size;
    if (count === 0) return;

    const isVideosView = state.currentView === 'videos';
    const label = isVideosView ? 'video' : 'file';
    if (!confirm(`Delete ${count} selected ${label}${count !== 1 ? 's' : ''}? They will be sent to your trash bin.`)) return;

    const paths = Array.from(state.selectedItems);
    let deleted = 0;
    let failed = 0;

    for (const path of paths) {
        const res = await electronAPI.deleteFile(path);
        if (res.success) {
            deleted++;
            // Remove from library
            const idx = state.playlist.findIndex(item => item.path === path);
            if (idx >= 0) state.playlist.splice(idx, 1);
            // Clean from favorites
            state.favorites = state.favorites.filter(p => p !== path);
            // Clean from playlists
            state.playlists.forEach(pl => {
                pl.songs = pl.songs.filter(p => p !== path);
            });
        } else {
            failed++;
        }
    }

    if (deleted > 0) {
        saveFavorites();
        savePlaylists();
        updateLibraryCount();
        showToast(`🗑 Deleted ${deleted} ${label}${deleted !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`);
    } else {
        showToast(`Failed to delete selected files.`);
    }

    exitSelectionMode();

    // Re-render current view
    if (state.currentView === 'library') renderLibraryView();
    else if (state.currentView === 'favorites') renderFavoritesView();
    else if (state.currentView === 'videos') renderVideosView();
}

// ---- Wire up selection toolbar buttons ----

// Library toolbar
if (librarySelectAllBtn) {
    librarySelectAllBtn.addEventListener('click', () => {
        selectAllInContainer(playlistEl);
        updateSelectionToolbarForCurrentView();
    });
}
if (libraryDeselectBtn) {
    libraryDeselectBtn.addEventListener('click', () => exitSelectionMode());
}
if (libraryPlaySelectedBtn) {
    libraryPlaySelectedBtn.addEventListener('click', () => playSelectedSongs());
}
if (libraryDeleteSelectedBtn) {
    libraryDeleteSelectedBtn.addEventListener('click', () => deleteSelectedItems());
}

// Favorites toolbar
if (favoritesSelectAllBtn) {
    favoritesSelectAllBtn.addEventListener('click', () => {
        selectAllInContainer(favoritesList);
        updateSelectionToolbarForCurrentView();
    });
}
if (favoritesDeselectBtn) {
    favoritesDeselectBtn.addEventListener('click', () => exitSelectionMode());
}
if (favoritesPlaySelectedBtn) {
    favoritesPlaySelectedBtn.addEventListener('click', () => playSelectedSongs());
}
if (favoritesDeleteSelectedBtn) {
    favoritesDeleteSelectedBtn.addEventListener('click', () => deleteSelectedItems());
}

// Videos toolbar
if (videosSelectAllBtn) {
    videosSelectAllBtn.addEventListener('click', () => {
        selectAllInContainer(videosList);
        updateSelectionToolbarForCurrentView();
    });
}
if (videosDeselectBtn) {
    videosDeselectBtn.addEventListener('click', () => exitSelectionMode());
}
if (videosDeleteSelectedBtn) {
    videosDeleteSelectedBtn.addEventListener('click', () => deleteSelectedItems());
}

// ---- "Add to Playlist" buttons on selection toolbars ----
function showPlaylistPickerForSelected() {
    const selectedPaths = Array.from(state.selectedItems).filter(p => !isVideoFile(p));
    if (selectedPaths.length === 0) {
        showToast('No audio tracks selected');
        return;
    }
    if (state.playlists.length === 0) {
        showToast('Create a playlist first');
        return;
    }
    // Reuse the song picker modal pattern — show a mini selection dialog
    // For simplicity, build inline picker
    const pickerHtml = state.playlists.map(pl => 
        `<div class="ctx-item playlist-pick-item" data-playlist-id="${pl.id}" style="padding:10px 16px;cursor:pointer;">${escapeHtml(pl.name)} <span style="opacity:0.5;font-size:0.8em">(${pl.songs.length} songs)</span></div>`
    ).join('');
    
    // Create a floating picker near the toolbar button
    let pickerEl = document.getElementById('sel-playlist-picker');
    if (pickerEl) pickerEl.remove();
    
    pickerEl = document.createElement('div');
    pickerEl.id = 'sel-playlist-picker';
    pickerEl.className = 'context-menu';
    pickerEl.style.cssText = 'position:fixed;z-index:210;max-height:300px;overflow-y:auto;';
    pickerEl.innerHTML = `<div style="padding:8px 14px;font-size:0.78rem;opacity:0.6;font-weight:600;">Add ${selectedPaths.length} song${selectedPaths.length !== 1 ? 's' : ''} to...</div>` + pickerHtml;
    document.body.appendChild(pickerEl);
    
    // Position near the button
    const btn = state.currentView === 'favorites' ? favoritesAddPlaylistBtn : libraryAddPlaylistBtn;
    if (btn) {
        const rect = btn.getBoundingClientRect();
        pickerEl.style.left = rect.left + 'px';
        pickerEl.style.top = (rect.bottom + 4) + 'px';
    } else {
        pickerEl.style.left = '50%';
        pickerEl.style.top = '50%';
    }
    
    pickerEl.querySelectorAll('.playlist-pick-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const plId = item.dataset.playlistId;
            const pl = state.playlists.find(p => p.id === plId);
            if (!pl) return;
            let added = 0;
            selectedPaths.forEach(path => {
                if (!pl.songs.includes(path)) {
                    pl.songs.push(path);
                    added++;
                }
            });
            savePlaylists();
            renderPlaylistsNav();
            if (added > 0) {
                showToast(`Added ${added} song${added !== 1 ? 's' : ''} to "${pl.name}"`);
            } else {
                showToast('All songs already in playlist');
            }
            pickerEl.remove();
        });
    });
    
    // Close on outside click
    const closePicker = (e) => {
        if (!pickerEl.contains(e.target)) {
            pickerEl.remove();
            document.removeEventListener('click', closePicker);
        }
    };
    setTimeout(() => document.addEventListener('click', closePicker), 10);
}

if (libraryAddPlaylistBtn) {
    libraryAddPlaylistBtn.addEventListener('click', () => showPlaylistPickerForSelected());
}
if (favoritesAddPlaylistBtn) {
    favoritesAddPlaylistBtn.addEventListener('click', () => showPlaylistPickerForSelected());
}

// ---- Context menu: Select / Select All / Bulk actions ----

// "Select" — enter selection mode and select the right-clicked item
ctxSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    contextMenu.classList.add('hidden');
    if (contextRightClickPath && contextRightClickListEl) {
        enterSelectionMode(contextRightClickListEl);
        if (!state.selectedItems.has(contextRightClickPath)) {
            toggleItemSelection(contextRightClickPath);
        }
        updateSelectionToolbarForCurrentView();
    }
});

// "Select All" — enter selection mode and select all in current view
ctxSelectAll.addEventListener('click', (e) => {
    e.stopPropagation();
    contextMenu.classList.add('hidden');
    if (state.currentView === 'library') selectAllInContainer(playlistEl);
    else if (state.currentView === 'favorites') selectAllInContainer(favoritesList);
    else if (state.currentView === 'videos') selectAllInContainer(videosList);
    updateSelectionToolbarForCurrentView();
});

// Bulk: Play Selected
ctxBulkPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    contextMenu.classList.add('hidden');
    playSelectedSongs();
});

// Bulk: Add Selected to Favorites
ctxBulkFav.addEventListener('click', (e) => {
    e.stopPropagation();
    contextMenu.classList.add('hidden');
    const paths = Array.from(state.selectedItems).filter(p => !isVideoFile(p));
    let added = 0;
    paths.forEach(path => {
        if (!state.favorites.includes(path)) {
            state.favorites.push(path);
            added++;
        }
    });
    if (added > 0) {
        saveFavorites();
        updateFavBadge();
        showToast(`♥ Added ${added} song${added !== 1 ? 's' : ''} to favorites`);
        paths.forEach(p => syncFavIconsForPath(p, true));
    } else {
        showToast('All selected songs already in favorites');
    }
    exitSelectionMode();
});

// Bulk: Add Selected to Playlist (submenu)
let bulkSubmenuHideTimer = null;

ctxBulkPlaylist.addEventListener('mouseenter', () => {
    clearTimeout(bulkSubmenuHideTimer);
    if (state.playlists.length === 0) {
        ctxBulkPlaylistSubmenu.innerHTML = `<div class="ctx-item" style="opacity:0.5;cursor:default">No playlists yet</div>`;
    } else {
        ctxBulkPlaylistSubmenu.innerHTML = '';
        state.playlists.forEach(pl => {
            const item = document.createElement('div');
            item.className = 'ctx-item';
            item.textContent = pl.name;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const paths = Array.from(state.selectedItems).filter(p => !isVideoFile(p));
                let added = 0;
                paths.forEach(path => {
                    if (!pl.songs.includes(path)) {
                        pl.songs.push(path);
                        added++;
                    }
                });
                savePlaylists();
                renderPlaylistsNav();
                if (added > 0) {
                    showToast(`Added ${added} song${added !== 1 ? 's' : ''} to "${pl.name}"`);
                } else {
                    showToast('All songs already in playlist');
                }
                contextMenu.classList.add('hidden');
                ctxBulkPlaylistSubmenu.classList.add('hidden');
                exitSelectionMode();
            });
            ctxBulkPlaylistSubmenu.appendChild(item);
        });
    }
    ctxBulkPlaylistSubmenu.style.top = '0';
    ctxBulkPlaylistSubmenu.style.left = (contextMenu.offsetWidth - 4) + 'px';
    ctxBulkPlaylistSubmenu.classList.remove('hidden');
});

ctxBulkPlaylist.addEventListener('mouseleave', () => {
    bulkSubmenuHideTimer = setTimeout(() => ctxBulkPlaylistSubmenu.classList.add('hidden'), 200);
});
ctxBulkPlaylistSubmenu.addEventListener('mouseenter', () => clearTimeout(bulkSubmenuHideTimer));
ctxBulkPlaylistSubmenu.addEventListener('mouseleave', () => {
    bulkSubmenuHideTimer = setTimeout(() => ctxBulkPlaylistSubmenu.classList.add('hidden'), 200);
});

// Bulk: Deselect All
ctxBulkDeselect.addEventListener('click', (e) => {
    e.stopPropagation();
    contextMenu.classList.add('hidden');
    exitSelectionMode();
});

// Bulk: Delete Selected
ctxBulkDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    contextMenu.classList.add('hidden');
    deleteSelectedItems();
});

// Keyboard shortcuts: Ctrl+A = select all in current view, Escape = deselect
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectionMode) {
        exitSelectionMode();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && state.selectionMode) {
        e.preventDefault();
        if (state.currentView === 'library') selectAllInContainer(playlistEl);
        else if (state.currentView === 'favorites') selectAllInContainer(favoritesList);
        else if (state.currentView === 'videos') selectAllInContainer(videosList);
        updateSelectionToolbarForCurrentView();
    }
});

// Exit selection mode when switching views
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
        if (state.selectionMode) exitSelectionMode();
    });
});

// ===================== WEEKLY REPORT =====================

/**
 * Generate and display the weekly listening report.
 * @param {boolean} isAutoShow - true if triggered automatically (week boundary), false if debug
 */
async function showWeeklyReport(isAutoShow = false) {
    const history = await getPlayHistory();

    // Determine the week range: last 7 days
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const weekPlays = history.filter(e => e.timestamp >= weekAgo);

    // Format period string
    const startDate = new Date(weekAgo);
    const endDate = new Date(now);
    const dateOpts = { month: 'short', day: 'numeric' };
    reportPeriod.textContent = `${startDate.toLocaleDateString(undefined, dateOpts)} — ${endDate.toLocaleDateString(undefined, dateOpts)}`;

    // Check if there's data
    const allReportSections = weeklyReportModal.querySelectorAll('.report-summary-cards, .report-section');
    if (weekPlays.length === 0) {
        allReportSections.forEach(s => s.style.display = 'none');
        reportEmpty.classList.remove('hidden');
        weeklyReportModal.classList.remove('hidden');
        return;
    }

    allReportSections.forEach(s => s.style.display = '');
    reportEmpty.classList.add('hidden');

    // --- Summary stats ---
    const uniqueSongPaths = new Set(weekPlays.map(e => e.path));
    const uniqueArtists = new Set(weekPlays.map(e => e.artist).filter(a => a && a !== 'Unknown Artist'));
    const totalDurationSec = weekPlays.reduce((sum, e) => sum + (e.duration || 0), 0);

    reportTotalPlays.textContent = weekPlays.length;
    reportUniqueSongs.textContent = uniqueSongPaths.size;
    reportUniqueArtists.textContent = uniqueArtists.size;

    // Format total time
    if (totalDurationSec >= 3600) {
        const hrs = Math.floor(totalDurationSec / 3600);
        const mins = Math.round((totalDurationSec % 3600) / 60);
        reportTotalTime.textContent = `${hrs}h ${mins}m`;
    } else {
        reportTotalTime.textContent = `${Math.round(totalDurationSec / 60)}m`;
    }

    // --- Top Songs (by play count) ---
    const songCounts = {};
    weekPlays.forEach(e => {
        const key = e.path;
        if (!songCounts[key]) songCounts[key] = { title: e.title, artist: e.artist, count: 0 };
        songCounts[key].count++;
    });
    const topSongs = Object.values(songCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    reportTopSongs.innerHTML = '';
    topSongs.forEach((s, i) => {
        const li = document.createElement('li');
        li.className = 'report-list-item';
        li.innerHTML = `
            <span class="report-rank">${i + 1}</span>
            <div class="report-item-info">
                <span class="report-item-title">${escapeHtml(s.title)}</span>
                <span class="report-item-sub">${escapeHtml(s.artist)}</span>
            </div>
            <span class="report-item-count">${s.count} play${s.count !== 1 ? 's' : ''}</span>
        `;
        reportTopSongs.appendChild(li);
    });

    // --- Top Artists ---
    const artistCounts = {};
    weekPlays.forEach(e => {
        if (!e.artist || e.artist === 'Unknown Artist') return;
        if (!artistCounts[e.artist]) artistCounts[e.artist] = 0;
        artistCounts[e.artist]++;
    });
    const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    reportTopArtists.innerHTML = '';
    topArtists.forEach(([artist, count], i) => {
        const li = document.createElement('li');
        li.className = 'report-list-item';
        li.innerHTML = `
            <span class="report-rank">${i + 1}</span>
            <div class="report-item-info">
                <span class="report-item-title">${escapeHtml(artist)}</span>
            </div>
            <span class="report-item-count">${count} play${count !== 1 ? 's' : ''}</span>
        `;
        reportTopArtists.appendChild(li);
    });

    // --- Top Genres ---
    const genreCounts = {};
    weekPlays.forEach(e => {
        if (!e.genre || e.genre === 'Unknown') return;
        if (!genreCounts[e.genre]) genreCounts[e.genre] = 0;
        genreCounts[e.genre]++;
    });
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    reportTopGenres.innerHTML = '';
    if (topGenres.length === 0) {
        reportTopGenres.innerHTML = '<li class="report-list-item" style="justify-content: center; color: var(--text-dim);">No genre data available</li>';
    } else {
        topGenres.forEach(([genre, count], i) => {
            const li = document.createElement('li');
            li.className = 'report-list-item';
            li.innerHTML = `
                <span class="report-rank">${i + 1}</span>
                <div class="report-item-info">
                    <span class="report-item-title">${escapeHtml(genre)}</span>
                </div>
                <span class="report-item-count">${count} play${count !== 1 ? 's' : ''}</span>
            `;
            reportTopGenres.appendChild(li);
        });
    }

    // --- Daily Activity Bar Chart ---
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0]; // index 0 = 7 days ago, index 6 = today
    const dayLabels = [];

    for (let d = 6; d >= 0; d--) {
        const dayStart = new Date(now - d * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const idx = 6 - d;
        dailyCounts[idx] = weekPlays.filter(e => e.timestamp >= dayStart.getTime() && e.timestamp <= dayEnd.getTime()).length;
        dayLabels[idx] = dayNames[dayStart.getDay()];
    }

    const maxCount = Math.max(...dailyCounts, 1);
    reportDailyChart.innerHTML = '';
    dailyCounts.forEach((count, i) => {
        const barWrapper = document.createElement('div');
        barWrapper.className = 'report-bar-wrapper';

        const barFill = document.createElement('div');
        barFill.className = 'report-bar-fill';
        const heightPct = (count / maxCount) * 100;
        barFill.style.height = `${heightPct}%`;
        if (count > 0) {
            barFill.title = `${count} play${count !== 1 ? 's' : ''}`;
        }

        const barCount = document.createElement('span');
        barCount.className = 'report-bar-count';
        barCount.textContent = count > 0 ? count : '';

        const barLabel = document.createElement('span');
        barLabel.className = 'report-bar-label';
        barLabel.textContent = dayLabels[i];

        barWrapper.appendChild(barCount);
        barWrapper.appendChild(barFill);
        barWrapper.appendChild(barLabel);
        reportDailyChart.appendChild(barWrapper);
    });

    // Show the modal
    weeklyReportModal.classList.remove('hidden');

    // If auto-shown, save the timestamp so we don't show again this week
    if (isAutoShow) {
        await saveLastReportDate(now);
    }
}

// Close weekly report modal
closeWeeklyReportBtn.addEventListener('click', () => {
    weeklyReportModal.classList.add('hidden');
});
weeklyReportModal.addEventListener('click', (e) => {
    if (e.target === weeklyReportModal) weeklyReportModal.classList.add('hidden');
});

// Debug button in settings
if (debugWeeklyReportBtn) {
    debugWeeklyReportBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
        showWeeklyReport(false);
    });
}

// Auto-show weekly report check (called on init, after library loads)
async function checkWeeklyReportAutoShow() {
    const lastReportDate = await getLastReportDate();
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    // Show if it's been at least 7 days since the last report was shown
    if (now - lastReportDate >= oneWeekMs) {
        // Only show if there's some play history in the past week
        const history = await getPlayHistory();
        const weekAgo = now - oneWeekMs;
        const weekPlays = history.filter(e => e.timestamp >= weekAgo);
        if (weekPlays.length > 0) {
            // Delay a bit so the app finishes loading before showing the modal
            setTimeout(() => showWeeklyReport(true), 2000);
        }
    }
}
