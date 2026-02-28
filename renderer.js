// ============================================================
// SOUNDSTORM MUSIC PLAYER — renderer.js
// Open Source Desktop MP3 Player
// ============================================================

// ===================== STATE =====================



const audio = new Audio();
audio.volume = 1;

import { addFolderBtn, addFolderBtn2, playlistEl, loadingIndicator, libraryCount, playPauseBtn, playIcon, pauseIcon, prevBtn, nextBtn, shuffleBtn, repeatBtn, seekBar, timeCurrent, timeTotal, volumeBar, muteBtn, volIconOn, volIconOff, trackTitle, trackArtist, trackArt, artPlaceholder, eqBars, bgBlur, playerFavBtn, favCountBadge, favCountText, favoritesList, favoritesEmpty, searchInput, searchResults, searchHint, playlistsNavList, newPlaylistBtn, folderList, settingsBtn, settingsModal, closeSettingsBtn, createPlaylistModal, closeCreatePlaylistBtn, cancelCreatePlaylistBtn, confirmCreatePlaylistBtn, newPlaylistNameInput, contextMenu, ctxPlay, ctxFav, ctxAddPlaylist, ctxPlaylistSubmenu, ctxRemovePlaylist, deletePlaylistBtn, playlistViewName, playlistViewCount, playlistViewSongs, playlistEmpty, addSongsToPlaylistBtn, songPickerModal, closeSongPickerBtn, cancelSongPickerBtn, confirmSongPickerBtn, songPickerSearch, songPickerList, songPickerSelectedCount, toast, colorPicker, bgColorPicker, panelColorPicker, glassOpacity, opacityVal, blurIntensity, blurVal, fontSelect, resetSettingsBtn, bgImageBtn, clearBgImageBtn, fontDropdown, fontDropdownTrigger, fontDropdownMenu, fontDropdownLabel, canvas, mobileMenuBtn, sidebar, sidebarOverlay } from './js/ui/dom.js';
import { state, saveFavorites, savePlaylists, saveFolders } from './js/core/state.js';
import { escapeHtml, showToast, formatTime } from './js/core/utils.js';


let currentFontValue = "'Outfit', sans-serif";
const canvasCtx = canvas.getContext('2d');
let audioCtx, analyser, source;

// ===================== INIT =====================
async function init() {
    loadSettings();
    renderPlaylistsNav();
    renderFolderList();
    updateFavBadge();

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

    state.currentView = viewId;

    if (viewId === 'favorites') renderFavoritesView();
    if (viewId === 'playlist' && params.id) openPlaylistView(params.id);
    if (viewId === 'folders') renderFolderList();
    if (viewId === 'search') searchInput.focus();

    // Close mobile sidebar if open
    if (sidebar && sidebar.classList.contains('sidebar-open')) {
        sidebar.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
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

// ===================== FOLDER MANAGEMENT =====================
async function doAddFolder() {
    const dirs = await electronAPI.openDirectory();
    if (dirs && dirs.length > 0) {
        const newFolders = dirs.filter(d => !state.scannedFolders.includes(d));
        state.scannedFolders = [...scannedFolders, ...newFolders];
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

    const files = await electronAPI.scanDirectories(dirs);

    for (const file of files) {
        if (!state.playlist.find(item => item.path === file)) {
            const metadata = await electronAPI.parseMetadata(file);
            state.playlist.push(metadata);
            renderSongRow(metadata, state.playlist.length - 1, playlistEl);
        }
    }

    updateLibraryCount();
    loadingIndicator.classList.add('hidden');
}

function updateLibraryCount() {
    const n = state.playlist.length;
    libraryCount.textContent = `${n} song${n !== 1 ? 's' : ''}`;
}

// ===================== SONG ROW RENDERER =====================
function renderSongRow(item, index, container, fromPlaylistId = null) {
    const li = document.createElement('li');
    li.className = 'song-row';
    li.dataset.index = index;

    const isFav = state.favorites.includes(item.path);
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
    } else {
        favoritesEmpty.classList.add('hidden');
        favSongs.forEach(song => {
            const realIndex = state.playlist.indexOf(song);
            renderSongRow(song, realIndex, favoritesList);
        });
    }
    if (favCountText) favCountText.textContent = `${favSongs.length} song${favSongs.length !== 1 ? 's' : ''}`;
}

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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/></svg>
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
        showToast('Song already in state.playlist');
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
                ? `<img src="${artSrc}" class="song-art-small" alt="" onerror="this.style.display='none'">`
                : `<div class="song-art-small" style="display:flex;align-items:center;justify-content:center;color:var(--text-dim);">${defaultArt}</div>`
            }
            <div class="song-info">
                <span class="song-title">${escapeHtml(song.title)}</span>
                <span class="song-meta">${escapeHtml(song.artist)}${song.album ? ' • ' + escapeHtml(song.album) : ''}</span>
            </div>
            <span class="song-duration">${song.duration ? formatTime(song.duration) : ''}</span>
            ${alreadyIn ? '<span style="font-size:0.75rem;color:var(--text-dim);padding:0 8px;">In state.playlist</span>' : ''}
        `;
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
    showToast('Removed from state.playlist');
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
        ctxPlaylistSubmenu.innerHTML = `<div class="ctx-item" style="opacity:0.5;cursor:default">No state.playlists yet — create one first</div>`;
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

// ===================== PLAYBACK =====================
async function playSong(index) {
    if (index < 0 || index >= state.playlist.length) return;

    state.currentIndex = index;
    const song = state.playlist[state.currentIndex];

    trackTitle.textContent = song.title;
    trackArtist.textContent = song.artist;

    if (song.picture) {
        trackArt.src = song.picture;
        trackArt.classList.remove('hidden');
        artPlaceholder.classList.add('hidden');
    } else {
        trackArt.src = '';
        trackArt.classList.add('hidden');
        artPlaceholder.classList.remove('hidden');
    }

    if (state.currentWallpaperUri) {
        bgBlur.style.backgroundImage = `url("${state.currentWallpaperUri}")`;
    } else if (song.picture) {
        bgBlur.style.backgroundImage = `url(${song.picture})`;
    } else {
        bgBlur.style.backgroundImage = 'none';
    }

    updatePlayerFavIcon(song.path);
    highlightCurrentSong();

    audio.src = electronAPI.getFileUri(song.path);
    audio.load();
    try {
        await audio.play();
        state.isPlaying = true;
        updatePlayPauseBtn();
        setupVisualizer();
    } catch (err) {
        console.error('Playback failed:', err);
    }
}

playPauseBtn.addEventListener('click', () => {
    if (state.playlist.length === 0) return;
    if (state.currentIndex < 0) { playSong(0); return; }
    if (state.isPlaying) {
        audio.pause();
        state.isPlaying = false;
        updatePlayPauseBtn();   // sync — state is correct right now
    } else {
        audio.play().then(() => {
            state.isPlaying = true;
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            updatePlayPauseBtn(); // inside .then() — state.isPlaying is now true
        }).catch(err => {
            console.error('Playback failed:', err);
        });
    }
});

function updatePlayPauseBtn() {
    playIcon.classList.toggle('hidden', state.isPlaying);
    pauseIcon.classList.toggle('hidden', !state.isPlaying);
    // Sync equalizer bars with play state
    if (eqBars) eqBars.classList.toggle('paused', !state.isPlaying);
}

prevBtn.addEventListener('click', () => {
    if (state.playlist.length === 0) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }

    let q = state.playQueueContext && state.playQueueContext.length > 0 ? state.playQueueContext : state.playlist.map((_, i) => i);
    const currQIdx = q.indexOf(state.currentIndex);

    if (currQIdx === -1) {
        // Fallback if not found in queue (shouldn't happen)
        playSong((state.currentIndex - 1 + state.playlist.length) % state.playlist.length);
    } else {
        const prevGlobal = q[(currQIdx - 1 + q.length) % q.length];
        playSong(prevGlobal);
    }
});

nextBtn.addEventListener('click', () => {
    if (state.playlist.length === 0) return;

    let q = state.playQueueContext && state.playQueueContext.length > 0 ? state.playQueueContext : state.playlist.map((_, i) => i);
    const currQIdx = q.indexOf(state.currentIndex);

    if (currQIdx === -1) {
        if (state.isShuffle) playSong(Math.floor(Math.random() * state.playlist.length));
        else playSong((state.currentIndex + 1) % state.playlist.length);
    } else {
        if (state.isShuffle) {
            playSong(q[Math.floor(Math.random() * q.length)]);
        } else {
            playSong(q[(currQIdx + 1) % q.length]);
        }
    }
});

audio.addEventListener('ended', () => {
    if (state.repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
    } else {
        nextBtn.click();
    }
});

// Shuffle
shuffleBtn.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    shuffleBtn.classList.toggle('active-mode', state.isShuffle);
    showToast(state.isShuffle ? 'Shuffle ON' : 'Shuffle OFF');
});

// Repeat
repeatBtn.addEventListener('click', () => {
    if (state.repeatMode === 'none') { state.repeatMode = 'all'; showToast('Repeat All'); }
    else if (state.repeatMode === 'all') { state.repeatMode = 'one'; showToast('Repeat One'); }
    else { state.repeatMode = 'none'; showToast('Repeat OFF'); }

    repeatBtn.classList.toggle('active-mode', state.repeatMode !== 'none');
    repeatBtn.title = `Repeat: ${state.repeatMode}`;
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
    if (v === 0 && !state.isMuted) setMuted(true);
    if (v > 0 && state.isMuted) setMuted(false);
});

muteBtn.addEventListener('click', () => setMuted(!state.isMuted));

function setMuted(mute) {
    state.isMuted = mute;
    audio.muted = state.isMuted;
    volIconOn.classList.toggle('hidden', state.isMuted);
    volIconOff.classList.toggle('hidden', !state.isMuted);
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

    const matches = state.playlist.filter(s =>
        s.title.toLowerCase().includes(term) ||
        s.artist.toLowerCase().includes(term) ||
        (s.album && s.album.toLowerCase().includes(term))
    );

    if (matches.length === 0) {
        searchResults.innerHTML = `<li style="padding: 20px; color: var(--text-muted); text-align: center;">No results for "<strong>${escapeHtml(term)}</strong>"</li>`;
    } else {
        matches.forEach(song => {
            const realIndex = state.playlist.indexOf(song);
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
    const savedOpacity = localStorage.getItem('soundstorm-glass-opacity') || '45';
    if (savedPanel) panelColorPicker.value = savedPanel;
    glassOpacity.value = savedOpacity;
    opacityVal.textContent = savedOpacity + '%';
    updatePanelGlass(savedPanel || '#121212', savedOpacity);

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
    state.currentWallpaperUri = uri || null;
    if (state.currentWallpaperUri) {
        bgBlur.style.backgroundImage = `url("${state.currentWallpaperUri}")`;
    } else if (!trackArt.classList.contains('hidden')) {
        bgBlur.style.backgroundImage = `url(${trackArt.src})`;
    } else {
        bgBlur.style.backgroundImage = 'none';
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
    if (path) {
        const uri = electronAPI.getFileUri(path);
        setAppWallpaper(uri);
        localStorage.setItem('soundstorm-bg-image', uri);

        // Auto-lower blur so they can clearly see the wallpaper they just picked
        blurIntensity.value = 10;
        blurVal.textContent = '10px';
        localStorage.setItem('soundstorm-blur-intensity', '10');
        applyBlur(10);
    }
});
clearBgImageBtn.addEventListener('click', () => { setAppWallpaper(null); localStorage.removeItem('soundstorm-bg-image'); });
resetSettingsBtn.addEventListener('click', () => {
    ['soundstorm-accent-color', 'soundstorm-bg-color', 'soundstorm-panel-color', 'soundstorm-glass-opacity', 'soundstorm-font', 'soundstorm-bg-image', 'soundstorm-blur-intensity'].forEach(k => localStorage.removeItem(k));
    document.documentElement.style.setProperty('--primary', '#ffffff');
    document.documentElement.style.setProperty('--bg-base', '#000000');
    updatePanelGlass('#121212', 45);
    setAppWallpaper(null);
    applyBlur(80);
    document.body.style.fontFamily = "'Outfit', sans-serif";
    colorPicker.value = '#ffffff';
    bgColorPicker.value = '#000000';
    panelColorPicker.value = '#121212';
    glassOpacity.value = 45;
    opacityVal.textContent = '45%';
    blurIntensity.value = 80;
    blurVal.textContent = '80px';
    applyFont("'Outfit', sans-serif");
    showToast('Settings reset to defaults');
});

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

        canvasCtx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
        canvasCtx.shadowBlur = 12;
        canvasCtx.shadowColor = `rgba(255, 255, 255, 0.3)`;

        const y = canvas.height - barH;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
        canvasCtx.fill();

        x += barW + 2;
    }
}
