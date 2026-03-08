// ============================================================
// LUMORA MUSIC PLAYER — audio.js
// Handles playback engine, volume, and visualizer
// ============================================================

import { state } from './state.js';
import {
    playPauseBtn, playIcon, pauseIcon, prevBtn, nextBtn, shuffleBtn, repeatBtn,
    seekBar, timeCurrent, timeTotal, volumeBar, muteBtn, volIconOn, volIconOff,
    trackTitle, trackArtist, trackArt, artPlaceholder, eqBars, bgBlur, canvas
} from '../ui/dom.js';
import { formatTime, showToast as toast } from './utils.js';

export const audio = new Audio();
audio.volume = 1;

let audioCtx, analyser, source, bassFilter, trebleFilter;
const canvasCtx = canvas.getContext('2d');
let uiHooks = {
    onSongChange: () => { },
    onWallpaperUpdate: () => { }
};

export function initAudio(hooks) {
    if (hooks) uiHooks = { ...uiHooks, ...hooks };

    // Playback Listeners
    playPauseBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);

    shuffleBtn.addEventListener('click', () => {
        state.isShuffle = !state.isShuffle;
        shuffleBtn.classList.toggle('active-mode', state.isShuffle);
        toast(state.isShuffle ? 'Shuffle ON' : 'Shuffle OFF');
    });

    repeatBtn.addEventListener('click', () => {
        if (state.repeatMode === 'none') { state.repeatMode = 'all'; toast('Repeat All'); }
        else if (state.repeatMode === 'all') { state.repeatMode = 'one'; toast('Repeat One'); }
        else { state.repeatMode = 'none'; toast('Repeat OFF'); }

        repeatBtn.classList.toggle('active-mode', state.repeatMode !== 'none');
        repeatBtn.title = `Repeat: ${state.repeatMode}`;
    });

    // Seek / Volume Listeners
    seekBar.addEventListener('input', () => {
        if (!audio.duration) return;
        audio.currentTime = (seekBar.value / 100) * audio.duration;
        
        // Save time when seeking
        import('./state.js').then(module => {
            module.saveLastTrackTime(audio.currentTime);
        });
    });

    volumeBar.addEventListener('input', () => {
        const v = volumeBar.value / 100;
        audio.volume = v;
        if (v === 0 && !state.isMuted) setMuted(true);
        if (v > 0 && state.isMuted) setMuted(false);
    });

    muteBtn.addEventListener('click', () => setMuted(!state.isMuted));

    // Audio Event Handlers
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        seekBar.value = (audio.currentTime / audio.duration) * 100;
        timeCurrent.textContent = formatTime(audio.currentTime);
        
        // Save time every 5 seconds
        if (Math.floor(audio.currentTime) % 5 === 0) {
            import('./state.js').then(module => {
                if (state.currentIndex >= 0) {
                    module.saveLastTrackTime(audio.currentTime);
                }
            });
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
        if (state.repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play();
        } else {
            nextSong();
        }
    });

    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        toast('Error playing audio file');
    });

    trackArt.addEventListener('error', () => {
        trackArt.classList.add('hidden');
        artPlaceholder.classList.remove('hidden');
    });

    // Keyboard controls proxy
    window.addEventListener('keydown', (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'ArrowRight') {
            if (audio.currentTime) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        } else if (e.code === 'ArrowLeft') {
            if (audio.currentTime) audio.currentTime = Math.max(0, audio.currentTime - 10);
        } else if (e.key === 'n') {
            nextSong();
        } else if (e.key === 'p') {
            prevSong();
        } else if (e.key === 's') {
            state.isShuffle = !state.isShuffle;
            shuffleBtn.classList.toggle('active-mode', state.isShuffle);
            toast(state.isShuffle ? 'Shuffle ON' : 'Shuffle OFF');
        } else if (e.key === 'm') {
            setMuted(!state.isMuted);
        }
    });

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

export async function playSong(index) {
    if (index < 0 || index >= state.playlist.length) return;

    state.currentIndex = index;
    const song = state.playlist[state.currentIndex];

    // Save last played track
    const { saveLastTrack, recordPlay } = await import('./state.js');
    saveLastTrack(song.path);

    // Record play event for weekly report
    recordPlay(song);

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

    // Wallpaper logic
    uiHooks.onWallpaperUpdate(state.currentWallpaperUri);

    uiHooks.onSongChange(song);

    audio.src = window.electronAPI.getFileUri(song.path);
    audio.load();
    try {
        await audio.play();
        state.isPlaying = true;
        updatePlayPauseBtnUI();
        setupVisualizer();
    } catch (err) {
        console.error('Playback failed:', err);
    }
}

export function togglePlay() {
    if (state.playlist.length === 0) return;
    if (state.currentIndex < 0) { playSong(0); return; }

    if (state.isPlaying) {
        audio.pause();
        state.isPlaying = false;
        updatePlayPauseBtnUI();
        
        // Save time when pausing
        import('./state.js').then(module => {
            module.saveLastTrackTime(audio.currentTime);
        });
    } else {
        audio.play().then(() => {
            state.isPlaying = true;
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            updatePlayPauseBtnUI();
        }).catch(err => {
            console.error('Playback failed:', err);
        });
    }
}

export function nextSong() {
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
}

export function prevSong() {
    if (state.playlist.length === 0) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }

    let q = state.playQueueContext && state.playQueueContext.length > 0 ? state.playQueueContext : state.playlist.map((_, i) => i);
    const currQIdx = q.indexOf(state.currentIndex);

    if (currQIdx === -1) {
        playSong((state.currentIndex - 1 + state.playlist.length) % state.playlist.length);
    } else {
        const prevGlobal = q[(currQIdx - 1 + q.length) % q.length];
        playSong(prevGlobal);
    }
}

export function setMuted(mute) {
    state.isMuted = mute;
    audio.muted = state.isMuted;
    volIconOn.classList.toggle('hidden', state.isMuted);
    volIconOff.classList.toggle('hidden', !state.isMuted);
}

export function updatePlayPauseBtnUI() {
    playIcon.classList.toggle('hidden', state.isPlaying);
    pauseIcon.classList.toggle('hidden', !state.isPlaying);
    if (eqBars) eqBars.classList.toggle('paused', !state.isPlaying);
}

// ===================== SOUND SETTINGS =====================
export function setBassGain(db) {
    if (bassFilter && audioCtx) {
        bassFilter.gain.setTargetAtTime(db, audioCtx.currentTime, 0.015);
    }
}

export function setTrebleGain(db) {
    if (trebleFilter && audioCtx) {
        trebleFilter.gain.setTargetAtTime(db, audioCtx.currentTime, 0.015);
    }
}

// Visualizer Logic
export function setupVisualizer() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // EQ chain: source → bass → treble → analyser → destination
        bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 200;
        bassFilter.gain.value = parseFloat(localStorage.getItem('lumora-bass') || '0');

        trebleFilter = audioCtx.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3200;
        trebleFilter.gain.value = parseFloat(localStorage.getItem('lumora-treble') || '0');

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        source = audioCtx.createMediaElementSource(audio);
        source.connect(bassFilter);
        bassFilter.connect(trebleFilter);
        trebleFilter.connect(analyser);
        analyser.connect(audioCtx.destination);

        drawVisualizer();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

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
