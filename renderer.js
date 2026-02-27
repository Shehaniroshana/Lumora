// ============================================================
// SOUNDSTORM MUSIC PLAYER — renderer.js
// Open Source Desktop MP3 Player
// ============================================================

// ===================== STATE =====================
let playlist = [];         // full library
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'none';   // 'none' | 'all' | 'one'
let isMuted = false;

let favorites = JSON.parse(localStorage.getItem('soundstorm-favorites') || '[]');
let playlists = JSON.parse(localStorage.getItem('soundstorm-playlists') || '[]');
let scannedFolders = JSON.parse(localStorage.getItem('soundstorm-folders') || '[]');
let currentWallpaperUri = null;  // tracks the user-set wallpaper URI

let currentView = 'library';
let activePlaylistId = null;   // ID of the playlist currently being viewed
let contextTargetIndex = -1;   // song index for right-click context menu

const audio = new Audio();
audio.volume = 1;

// ===================== DOM =====================
const addFolderBtn = document.getElementById('add-folder-btn');
const addFolderBtn2 = document.getElementById('add-folder-btn-2');
const playlistEl = document.getElementById('playlist');
const loadingIndicator = document.getElementById('loading-indicator');
const libraryCount = document.getElementById('library-count');

const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');

const seekBar = document.getElementById('seek-bar');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const volumeBar = document.getElementById('volume-bar');
const muteBtn = document.getElementById('mute-btn');
const volIconOn = document.getElementById('vol-icon-on');
const volIconOff = document.getElementById('vol-icon-off');

const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackArt = document.getElementById('track-art');
const artPlaceholder = document.getElementById('art-placeholder');
const bgBlur = document.getElementById('bg-blur');
const playerFavBtn = document.getElementById('player-fav-btn');

const favCountBadge = document.getElementById('fav-count-badge');
const favCountText = document.getElementById('fav-count-text');
const favoritesList = document.getElementById('favorites-list');
const favoritesEmpty = document.getElementById('favorites-empty');

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchHint = document.getElementById('search-hint');

const playlistsNavList = document.getElementById('playlists-nav-list');
const newPlaylistBtn = document.getElementById('new-playlist-btn');
const folderList = document.getElementById('folder-list');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');

const createPlaylistModal = document.getElementById('create-playlist-modal');
const closeCreatePlaylistBtn = document.getElementById('close-create-playlist-btn');
const cancelCreatePlaylistBtn = document.getElementById('cancel-create-playlist-btn');
const confirmCreatePlaylistBtn = document.getElementById('confirm-create-playlist-btn');
const newPlaylistNameInput = document.getElementById('new-playlist-name');

const contextMenu = document.getElementById('context-menu');
const ctxPlay = document.getElementById('ctx-play');
const ctxFav = document.getElementById('ctx-fav');
const ctxAddPlaylist = document.getElementById('ctx-add-playlist');
const ctxPlaylistSubmenu = document.getElementById('ctx-playlist-submenu');

const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
const playlistViewName = document.getElementById('playlist-view-name');
const playlistViewCount = document.getElementById('playlist-view-count');
const playlistViewSongs = document.getElementById('playlist-view-songs');
const playlistEmpty = document.getElementById('playlist-empty');

const toast = document.getElementById('toast');

// Settings Elements
const colorPicker = document.getElementById('color-picker');
const bgColorPicker = document.getElementById('bg-color-picker');
const panelColorPicker = document.getElementById('panel-color-picker');
const glassOpacity = document.getElementById('glass-opacity');
const opacityVal = document.getElementById('opacity-val');
const blurIntensity = document.getElementById('blur-intensity');
const blurVal = document.getElementById('blur-val');
const fontSelect = document.getElementById('font-select');
const resetSettingsBtn = document.getElementById('reset-settings-btn');
const bgImageBtn = document.getElementById('bg-image-btn');
const clearBgImageBtn = document.getElementById('clear-bg-image-btn');

// Custom font dropdown
const fontDropdown = document.getElementById('font-dropdown');
const fontDropdownTrigger = document.getElementById('font-dropdown-trigger');
const fontDropdownMenu = document.getElementById('font-dropdown-menu');
const fontDropdownLabel = document.getElementById('font-dropdown-label');
let currentFontValue = "'Outfit', sans-serif";

// Visualizer
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
let audioCtx, analyser, source;

// ===================== INIT =====================
async function init() {
    loadSettings();
    renderPlaylistsNav();
    renderFolderList();
    updateFavBadge();

    if (scannedFolders.length > 0) {
        // User has previously added folders — scan those
        await scanFolders(scannedFolders);
    } else {
        // First launch OR no folders saved: auto-detect default system music dirs
        const defaultDirs = await electronAPI.getDefaultDirs();
        if (defaultDirs && defaultDirs.length > 0) {
            scannedFolders = defaultDirs;
            localStorage.setItem('soundstorm-folders', JSON.stringify(scannedFolders));
            renderFolderList();
            showToast('🎵 Scanning your Music and Downloads folders...');
            await scanFolders(defaultDirs);
        }
    }
}
init();

// ===================== VIEWS =====================
function switchView(viewId, params = {}) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${viewId}`);
    if (view) view.classList.add('active');

    const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (navItem) navItem.classList.add('active');

    currentView = viewId;

    if (viewId === 'favorites') renderFavoritesView();
    if (viewId === 'playlist' && params.id) openPlaylistView(params.id);
    if (viewId === 'folders') renderFolderList();
    if (viewId === 'search') searchInput.focus();
}

document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
});

// ===================== FOLDER MANAGEMENT =====================
async function doAddFolder() {
    const dirs = await electronAPI.openDirectory();
    if (dirs && dirs.length > 0) {
        const newFolders = dirs.filter(d => !scannedFolders.includes(d));
        scannedFolders = [...scannedFolders, ...newFolders];
        localStorage.setItem('soundstorm-folders', JSON.stringify(scannedFolders));
        renderFolderList();
        if (newFolders.length > 0) await scanFolders(newFolders);
    }
}

addFolderBtn.addEventListener('click', doAddFolder);
addFolderBtn2.addEventListener('click', doAddFolder);

function renderFolderList() {
    folderList.innerHTML = '';
    if (scannedFolders.length === 0) {
        folderList.innerHTML = '<li style="padding: 20px; color: var(--text-muted); text-align: center; font-size: 0.9rem;">No folders added yet. Click "Add Folder" to get started.</li>';
        return;
    }
    scannedFolders.forEach((folder, idx) => {
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
            scannedFolders.splice(idx, 1);
            localStorage.setItem('soundstorm-folders', JSON.stringify(scannedFolders));
            showToast('Folder removed. Refresh to rescan library.');
            renderFolderList();
        });
    });
}

// ===================== LIBRARY SCANNING =====================
async function scanFolders(dirs) {
    loadingIndicator.classList.remove('hidden');

    const files = await electronAPI.scanDirectories(dirs);

    for (const file of files) {
        if (!playlist.find(item => item.path === file)) {
            const metadata = await electronAPI.parseMetadata(file);
            playlist.push(metadata);
            renderSongRow(metadata, playlist.length - 1, playlistEl);
        }
    }

    updateLibraryCount();
    loadingIndicator.classList.add('hidden');
}

function updateLibraryCount() {
    const n = playlist.length;
    libraryCount.textContent = `${n} song${n !== 1 ? 's' : ''}`;
}

// ===================== SONG ROW RENDERER =====================
function renderSongRow(item, index, container, fromPlaylistId = null) {
    const li = document.createElement('li');
    li.className = 'song-row';
    li.dataset.index = index;

    const isFav = favorites.includes(item.path);
    const artSrc = item.picture || '';
    const defaultArt = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`;

    li.innerHTML = `
        <span class="song-num">${index + 1}</span>
        ${artSrc
            ? `<img src="${artSrc}" class="song-art-small" alt="" onerror="this.style.display='none'">`
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

    // Click to play
    li.addEventListener('click', (e) => {
        if (e.target.closest('.song-fav-btn')) return;
        playSong(index);
    });

    // Fav button inside song row
    li.querySelector('.song-fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const isFavNow = !favorites.includes(item.path);   // what it WILL be after toggle
        toggleFavorite(item.path);                          // toggle it
        // Immediately update this row visually
        const btn = e.currentTarget;
        btn.classList.toggle('active', isFavNow);
        btn.title = isFavNow ? 'Remove from Favorites' : 'Add to Favorites';
        const svg = btn.querySelector('svg');
        svg.setAttribute('fill', isFavNow ? 'currentColor' : 'none');
        svg.setAttribute('stroke', isFavNow ? '#f43f5e' : 'currentColor');
        // Sync all other rows showing the same song
        syncFavIconsForPath(item.path, isFavNow);
    });

    // Right-click for context menu
    li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, index);
    });

    container.appendChild(li);
    return li;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Sync fav icons across all song rows that show the same path
function syncFavIconsForPath(path, isFav) {
    document.querySelectorAll('.song-row').forEach(row => {
        const idx = parseInt(row.dataset.index);
        if (!isNaN(idx) && playlist[idx] && playlist[idx].path === path) {
            const btn = row.querySelector('.song-fav-btn');
            if (btn) {
                btn.classList.toggle('active', isFav);
                btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
                const svg = btn.querySelector('svg');
                svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
                svg.setAttribute('stroke', isFav ? '#f43f5e' : 'currentColor');
            }
        }
    });
    updateFavBadge();
}

function highlightCurrentSong() {
    document.querySelectorAll('.song-row').forEach(row => {
        const idx = parseInt(row.dataset.index);
        row.classList.toggle('playing', idx === currentIndex);
    });
}

// ===================== FAVORITES =====================
function toggleFavorite(path) {
    const idx = favorites.indexOf(path);
    if (idx === -1) {
        favorites.push(path);
        showToast('❤ Added to Favorites');
    } else {
        favorites.splice(idx, 1);
        showToast('Removed from Favorites');
    }
    localStorage.setItem('soundstorm-favorites', JSON.stringify(favorites));
    updateFavBadge();
    // Update player fav icon if this is the current song
    if (currentIndex >= 0) updatePlayerFavIcon(playlist[currentIndex].path);
    // Refresh favorites view if it's open
    if (currentView === 'favorites') renderFavoritesView();
}

function updateFavBadge() {
    const count = favorites.length;
    favCountBadge.textContent = count;
    favCountBadge.classList.toggle('hidden', count === 0);
    if (favCountText) favCountText.textContent = `${count} song${count !== 1 ? 's' : ''}`;
}

function updatePlayerFavIcon(path) {
    const isFav = favorites.includes(path);
    playerFavBtn.classList.toggle('active', isFav);
    const svg = playerFavBtn.querySelector('svg');
    if (svg) {
        svg.setAttribute('fill', isFav ? '#f43f5e' : 'none');
        svg.setAttribute('stroke', isFav ? '#f43f5e' : 'currentColor');
    }
    playerFavBtn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
}

function renderFavoritesView() {
    favoritesList.innerHTML = '';
    // favorites is a list of file paths; find matching songs in library
    const favSongs = favorites
        .map(path => playlist.find(s => s.path === path))
        .filter(Boolean);  // ignore any saved paths no longer in library

    if (favSongs.length === 0) {
        favoritesEmpty.classList.remove('hidden');
    } else {
        favoritesEmpty.classList.add('hidden');
        favSongs.forEach(song => {
            const realIndex = playlist.indexOf(song);
            renderSongRow(song, realIndex, favoritesList);
        });
    }
    if (favCountText) favCountText.textContent = `${favSongs.length} song${favSongs.length !== 1 ? 's' : ''}`;
}

playerFavBtn.addEventListener('click', () => {
    if (currentIndex < 0 || !playlist[currentIndex]) return;
    const song = playlist[currentIndex];
    const isFavNow = !favorites.includes(song.path);   // what it WILL be
    toggleFavorite(song.path);                          // toggle
    syncFavIconsForPath(song.path, isFavNow);
    // Update the player bar button itself
    playerFavBtn.classList.toggle('active', isFavNow);
    const svg = playerFavBtn.querySelector('svg');
    svg.setAttribute('fill', isFavNow ? '#f43f5e' : 'none');
    svg.setAttribute('stroke', isFavNow ? '#f43f5e' : 'currentColor');
});

// ===================== PLAYLISTS =====================
function createPlaylist(name) {
    const id = 'pl_' + Date.now();
    playlists.push({ id, name, songs: [] });
    savePlaylists();
    renderPlaylistsNav();
    showToast(`Playlist "${name}" created`);
    return id;
}

function savePlaylists() {
    localStorage.setItem('soundstorm-playlists', JSON.stringify(playlists));
}

function renderPlaylistsNav() {
    playlistsNavList.innerHTML = '';
    playlists.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'nav-item' + (activePlaylistId === pl.id && currentView === 'playlist' ? ' active' : '');
        div.dataset.view = 'playlist';
        div.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/></svg>
            <span>${escapeHtml(pl.name)}</span>
            <span style="margin-left:auto;font-size:0.75rem;color:var(--text-dim)">${pl.songs.length}</span>
        `;
        div.addEventListener('click', () => {
            activePlaylistId = pl.id;
            switchView('playlist', { id: pl.id });
        });
        playlistsNavList.appendChild(div);
    });
}

function openPlaylistView(id) {
    activePlaylistId = id;
    const pl = playlists.find(p => p.id === id);
    if (!pl) return;
    playlistViewName.textContent = pl.name;
    playlistViewSongs.innerHTML = '';
    const songs = pl.songs.map(path => playlist.find(s => s.path === path)).filter(Boolean);
    playlistViewCount.textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
    playlistEmpty.classList.toggle('hidden', songs.length > 0);
    songs.forEach((song) => {
        const realIndex = playlist.indexOf(song);
        renderSongRow(song, realIndex, playlistViewSongs, id);
    });
    renderPlaylistsNav();
}

function addSongToPlaylist(playlistId, songPath) {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (pl.songs.includes(songPath)) {
        showToast('Song already in playlist');
        return;
    }
    pl.songs.push(songPath);
    savePlaylists();
    renderPlaylistsNav();
    showToast(`Added to "${pl.name}"`);
    if (activePlaylistId === playlistId && currentView === 'playlist') openPlaylistView(playlistId);
}

// Create playlist UI
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
    if (!activePlaylistId) return;
    const pl = playlists.find(p => p.id === activePlaylistId);
    if (!pl) return;
    if (!confirm(`Delete playlist "${pl.name}"?`)) return;
    playlists = playlists.filter(p => p.id !== activePlaylistId);
    savePlaylists();
    renderPlaylistsNav();
    activePlaylistId = null;
    switchView('library');
    showToast('Playlist deleted');
});

// ===================== CONTEXT MENU =====================
function showContextMenu(e, index) {
    contextTargetIndex = index;
    const x = Math.min(e.clientX, window.innerWidth - 210);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
    ctxPlaylistSubmenu.classList.add('hidden');

    const isFav = favorites.includes(playlist[index]?.path);
    ctxFav.textContent = isFav ? '♥ Remove from Favorites' : '♡ Add to Favorites';
}

document.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
    ctxPlaylistSubmenu.classList.add('hidden');
});

contextMenu.addEventListener('click', (e) => e.stopPropagation());

ctxPlay.addEventListener('click', () => {
    if (contextTargetIndex >= 0) playSong(contextTargetIndex);
    contextMenu.classList.add('hidden');
});

ctxFav.addEventListener('click', () => {
    if (contextTargetIndex < 0) return;
    const path = playlist[contextTargetIndex]?.path;
    if (path) {
        toggleFavorite(path);
        updateAllFavIcons(path, favorites.includes(path));
    }
    contextMenu.classList.add('hidden');
});

ctxAddPlaylist.addEventListener('mouseenter', () => {
    if (playlists.length === 0) {
        ctxPlaylistSubmenu.innerHTML = `<div class="ctx-item" style="opacity:0.5;cursor:default">No playlists yet</div>`;
    } else {
        ctxPlaylistSubmenu.innerHTML = '';
        playlists.forEach(pl => {
            const item = document.createElement('div');
            item.className = 'ctx-item';
            item.textContent = pl.name;
            item.addEventListener('click', () => {
                if (contextTargetIndex >= 0) {
                    addSongToPlaylist(pl.id, playlist[contextTargetIndex].path);
                }
                contextMenu.classList.add('hidden');
            });
            ctxPlaylistSubmenu.appendChild(item);
        });
    }

    const rect = ctxAddPlaylist.getBoundingClientRect();
    ctxPlaylistSubmenu.style.top = '0';
    ctxPlaylistSubmenu.style.left = (contextMenu.offsetWidth - 4) + 'px';
    ctxPlaylistSubmenu.classList.remove('hidden');
});

ctxAddPlaylist.addEventListener('mouseleave', (e) => {
    if (!e.relatedTarget || !ctxPlaylistSubmenu.contains(e.relatedTarget)) {
        ctxPlaylistSubmenu.classList.add('hidden');
    }
});

ctxPlaylistSubmenu.addEventListener('mouseleave', () => {
    ctxPlaylistSubmenu.classList.add('hidden');
});

// ===================== PLAYBACK =====================
async function playSong(index) {
    if (index < 0 || index >= playlist.length) return;

    currentIndex = index;
    const song = playlist[currentIndex];

    trackTitle.textContent = song.title;
    trackArtist.textContent = song.artist;

    if (song.picture) {
        trackArt.src = song.picture;
        trackArt.classList.remove('hidden');
        artPlaceholder.classList.add('hidden');
        bgBlur.style.backgroundImage = `url(${song.picture})`;
    } else {
        trackArt.src = '';
        trackArt.classList.add('hidden');
        artPlaceholder.classList.remove('hidden');
        // Fall back to wallpaper on bgBlur if one is set
        bgBlur.style.backgroundImage = currentWallpaperUri ? `url("${currentWallpaperUri}")` : 'none';
    }

    updatePlayerFavIcon(song.path);
    highlightCurrentSong();

    audio.src = electronAPI.getFileUri(song.path);
    audio.load();
    try {
        await audio.play();
        isPlaying = true;
        updatePlayPauseBtn();
        setupVisualizer();
    } catch (err) {
        console.error('Playback failed:', err);
    }
}

playPauseBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    if (currentIndex < 0) { playSong(0); return; }
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
    } else {
        audio.play().then(() => {
            isPlaying = true;
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        });
    }
    updatePlayPauseBtn();
});

function updatePlayPauseBtn() {
    playIcon.classList.toggle('hidden', isPlaying);
    pauseIcon.classList.toggle('hidden', !isPlaying);
}

prevBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const prev = (currentIndex - 1 + playlist.length) % playlist.length;
    playSong(prev);
});

nextBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    if (isShuffle) {
        const rand = Math.floor(Math.random() * playlist.length);
        playSong(rand);
    } else {
        playSong((currentIndex + 1) % playlist.length);
    }
});

audio.addEventListener('ended', () => {
    if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
    } else {
        nextBtn.click();
    }
});

// Shuffle
shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active-mode', isShuffle);
    showToast(isShuffle ? 'Shuffle ON' : 'Shuffle OFF');
});

// Repeat
repeatBtn.addEventListener('click', () => {
    if (repeatMode === 'none') { repeatMode = 'all'; showToast('Repeat All'); }
    else if (repeatMode === 'all') { repeatMode = 'one'; showToast('Repeat One'); }
    else { repeatMode = 'none'; showToast('Repeat OFF'); }

    repeatBtn.classList.toggle('active-mode', repeatMode !== 'none');
    repeatBtn.title = `Repeat: ${repeatMode}`;
});

// Seek
seekBar.addEventListener('input', () => {
    if (!audio.duration) return;
    audio.currentTime = (seekBar.value / 100) * audio.duration;
});

audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    seekBar.value = (audio.currentTime / audio.duration) * 100;
    timeCurrent.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = formatTime(audio.duration);
});

// Volume
volumeBar.addEventListener('input', () => {
    const v = volumeBar.value / 100;
    audio.volume = v;
    if (v === 0 && !isMuted) setMuted(true);
    if (v > 0 && isMuted) setMuted(false);
});

muteBtn.addEventListener('click', () => setMuted(!isMuted));

function setMuted(mute) {
    isMuted = mute;
    audio.muted = isMuted;
    volIconOn.classList.toggle('hidden', isMuted);
    volIconOff.classList.toggle('hidden', !isMuted);
}

// ===================== SEARCH =====================
searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
        searchResults.classList.add('hidden');
        searchHint.classList.remove('hidden');
        return;
    }
    searchHint.classList.add('hidden');
    searchResults.innerHTML = '';

    const matches = playlist.filter(s =>
        s.title.toLowerCase().includes(term) ||
        s.artist.toLowerCase().includes(term) ||
        (s.album && s.album.toLowerCase().includes(term))
    );

    if (matches.length === 0) {
        searchResults.innerHTML = `<li style="padding: 20px; color: var(--text-muted); text-align: center;">No results for "<strong>${escapeHtml(term)}</strong>"</li>`;
    } else {
        matches.forEach(song => {
            const realIndex = playlist.indexOf(song);
            renderSongRow(song, realIndex, searchResults);
        });
    }

    searchResults.classList.remove('hidden');
});

// ===================== KEYBOARD =====================
window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.code === 'Space') { e.preventDefault(); playPauseBtn.click(); }
    else if (e.code === 'ArrowRight') { if (audio.currentTime) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); }
    else if (e.code === 'ArrowLeft') { if (audio.currentTime) audio.currentTime = Math.max(0, audio.currentTime - 10); }
    else if (e.key === 'n') nextBtn.click();
    else if (e.key === 'p') prevBtn.click();
    else if (e.key === 's') shuffleBtn.click();
    else if (e.key === 'm') muteBtn.click();
});

// ===================== SETTINGS =====================
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

function loadSettings() {
    const savedColor = localStorage.getItem('soundstorm-accent-color');
    if (savedColor) { document.documentElement.style.setProperty('--primary', savedColor); colorPicker.value = savedColor; }

    const savedBg = localStorage.getItem('soundstorm-bg-color');
    if (savedBg) { document.documentElement.style.setProperty('--bg-base', savedBg); bgColorPicker.value = savedBg; }

    const savedPanel = localStorage.getItem('soundstorm-panel-color');
    const savedOpacity = localStorage.getItem('soundstorm-glass-opacity') || '60';
    if (savedPanel) panelColorPicker.value = savedPanel;
    glassOpacity.value = savedOpacity;
    opacityVal.textContent = savedOpacity + '%';
    updatePanelGlass(savedPanel || '#1a1a1e', savedOpacity);

    const savedFont = localStorage.getItem('soundstorm-font') || "'Outfit', sans-serif";
    applyFont(savedFont);

    const savedBlur = localStorage.getItem('soundstorm-blur-intensity') || '80';
    blurIntensity.value = savedBlur;
    blurVal.textContent = savedBlur + 'px';
    applyBlur(savedBlur);

    const savedWallpaper = localStorage.getItem('soundstorm-bg-image');
    if (savedWallpaper) setAppWallpaper(savedWallpaper);
}

function hexToRgba(hex, alpha) {
    if (!hex || hex.length < 7) return 'rgba(0,0,0,0)';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function updatePanelGlass(hex, pct) {
    const a = parseInt(pct) / 100;
    document.documentElement.style.setProperty('--panel-bg', hexToRgba(hex, a));
    document.documentElement.style.setProperty('--panel-dark', hexToRgba(hex, Math.min(1, a + 0.3)));
    document.documentElement.style.setProperty('--sidebar-bg', hexToRgba(hex, Math.min(1, a + 0.2)));
}

function setAppWallpaper(uri) {
    currentWallpaperUri = uri || null;
    if (uri) {
        // Show the wallpaper on bgBlur when no album art is playing
        // (album art in bgBlur takes priority via playSong)
        if (trackArt.classList.contains('hidden')) {
            bgBlur.style.backgroundImage = `url("${uri}")`;
        }
    } else {
        // Clear wallpaper — if no album art showing, clear bgBlur too
        if (trackArt.classList.contains('hidden')) {
            bgBlur.style.backgroundImage = 'none';
        }
    }
}

function applyBlur(px) {
    const blurPx = parseInt(px);
    // Scale brightness: 0 blur = 70% (wallpaper visible), 150px blur = 8% (dark ambient)
    const brightness = Math.max(0.08, 0.7 - (blurPx / 150) * 0.62).toFixed(2);
    // Scale down transform at low blur so cropped edges aren't obvious
    const scale = blurPx < 10 ? 1.0 : 1.08;
    bgBlur.style.filter = `blur(${blurPx}px) brightness(${brightness}) saturate(1.4)`;
    bgBlur.style.transform = `scale(${scale})`;
}

colorPicker.addEventListener('input', (e) => { document.documentElement.style.setProperty('--primary', e.target.value); localStorage.setItem('soundstorm-accent-color', e.target.value); });
bgColorPicker.addEventListener('input', (e) => { document.documentElement.style.setProperty('--bg-base', e.target.value); localStorage.setItem('soundstorm-bg-color', e.target.value); });
panelColorPicker.addEventListener('input', (e) => { localStorage.setItem('soundstorm-panel-color', e.target.value); updatePanelGlass(e.target.value, glassOpacity.value); });
glassOpacity.addEventListener('input', (e) => { opacityVal.textContent = e.target.value + '%'; localStorage.setItem('soundstorm-glass-opacity', e.target.value); updatePanelGlass(panelColorPicker.value, e.target.value); });
blurIntensity.addEventListener('input', (e) => {
    blurVal.textContent = e.target.value + 'px';
    localStorage.setItem('soundstorm-blur-intensity', e.target.value);
    applyBlur(e.target.value);
});
// --------- Custom Font Dropdown ---------
function applyFont(val) {
    currentFontValue = val;
    document.body.style.fontFamily = val;
    localStorage.setItem('soundstorm-font', val);
    // Find by iteration to avoid CSS selector quote issues
    const items = Array.from(fontDropdownMenu.querySelectorAll('.custom-dropdown-item'));
    const matched = items.find(el => el.dataset.value === val);
    if (matched) fontDropdownLabel.textContent = matched.textContent;
    items.forEach(el => el.classList.toggle('selected', el.dataset.value === val));
}

fontDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = fontDropdown.classList.toggle('open');
    fontDropdownMenu.classList.toggle('hidden', !isOpen);
});

fontDropdownMenu.querySelectorAll('.custom-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        applyFont(item.dataset.value);
        fontDropdown.classList.remove('open');
        fontDropdownMenu.classList.add('hidden');
    });
});

document.addEventListener('click', () => {
    fontDropdown.classList.remove('open');
    fontDropdownMenu.classList.add('hidden');
});

bgImageBtn.addEventListener('click', async () => {
    const path = await electronAPI.openImage();
    if (path) { const uri = electronAPI.getFileUri(path); setAppWallpaper(uri); localStorage.setItem('soundstorm-bg-image', uri); }
});
clearBgImageBtn.addEventListener('click', () => { setAppWallpaper(null); localStorage.removeItem('soundstorm-bg-image'); });
resetSettingsBtn.addEventListener('click', () => {
    ['soundstorm-accent-color', 'soundstorm-bg-color', 'soundstorm-panel-color', 'soundstorm-glass-opacity', 'soundstorm-font', 'soundstorm-bg-image', 'soundstorm-blur-intensity'].forEach(k => localStorage.removeItem(k));
    document.documentElement.style.setProperty('--primary', '#a78bfa');
    document.documentElement.style.setProperty('--bg-base', '#0f0f11');
    updatePanelGlass('#1a1a1e', 60);
    setAppWallpaper(null);
    applyBlur(80);
    document.body.style.fontFamily = "'Outfit', sans-serif";
    colorPicker.value = '#a78bfa';
    bgColorPicker.value = '#0f0f11';
    panelColorPicker.value = '#1a1a1e';
    glassOpacity.value = 60;
    opacityVal.textContent = '60%';
    blurIntensity.value = 80;
    blurVal.textContent = '80px';
    applyFont("'Outfit', sans-serif");
    showToast('Settings reset to defaults');
});

// ===================== TOAST =====================
let toastTimer;
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2000);
}

// ===================== UTILS =====================
function formatTime(s) {
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ===================== VISUALIZER =====================
function setupVisualizer() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        drawVisualizer();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyser) return;

    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const barW = (canvas.width / bufLen) * 2.5;
    let x = 0;

    for (let i = 0; i < bufLen; i++) {
        const v = data[i];
        const barH = (v / 255) * canvas.height * 0.8;
        const opacity = 0.4 + (v / 255) * 0.6;

        canvasCtx.fillStyle = `rgba(167, 139, 250, ${opacity * 0.5})`;
        canvasCtx.shadowBlur = 12;
        canvasCtx.shadowColor = `rgba(167, 139, 250, 0.3)`;

        const y = canvas.height - barH;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
        canvasCtx.fill();

        x += barW + 2;
    }
}
