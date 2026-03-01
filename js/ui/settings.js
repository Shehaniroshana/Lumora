// ============================================================
// SOUNDSTORM MUSIC PLAYER — settings.js
// Handles app configuration, theming, and persistence
// ============================================================

import {
    colorPicker, bgColorPicker, panelColorPicker, glassOpacity, opacityVal,
    blurIntensity, blurVal, resetSettingsBtn, bgImageBtn, clearBgImageBtn,
    fontDropdown, fontDropdownTrigger, fontDropdownMenu, fontDropdownLabel,
    settingsBtn, settingsModal, closeSettingsBtn, bgBlur, trackArt,
    bassGain, bassVal, trebleGain, trebleVal, resetSoundBtn,
    eqToggleBtn, eqPanel, eqPanelClose, panelBassGain, panelBassVal,
    panelTrebleGain, panelTrebleVal, eqPanelReset
} from './dom.js';
import { state } from '../core/state.js';
import { showToast as toast } from '../core/utils.js';
import { setBassGain, setTrebleGain } from '../core/audio.js';

let currentFontValue = "'Outfit', sans-serif";

export function initSettings() {
    // Modal toggle
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    // Color Pickers
    colorPicker.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--primary', e.target.value);
        localStorage.setItem('soundstorm-accent-color', e.target.value);
    });

    bgColorPicker.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--bg-base', e.target.value);
        localStorage.setItem('soundstorm-bg-color', e.target.value);
    });

    panelColorPicker.addEventListener('input', (e) => {
        localStorage.setItem('soundstorm-panel-color', e.target.value);
        updatePanelGlass(e.target.value, glassOpacity.value);
    });

    // Glass & Blur
    glassOpacity.addEventListener('input', (e) => {
        opacityVal.textContent = e.target.value + '%';
        localStorage.setItem('soundstorm-glass-opacity', e.target.value);
        updatePanelGlass(panelColorPicker.value, e.target.value);
    });

    blurIntensity.addEventListener('input', (e) => {
        blurVal.textContent = e.target.value + 'px';
        localStorage.setItem('soundstorm-blur-intensity', e.target.value);
        applyBlur(e.target.value);
    });

    // Font Dropdown
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

    // Background Image
    bgImageBtn.addEventListener('click', async () => {
        const path = await window.electronAPI.openImage();
        if (path) {
            const uri = window.electronAPI.getFileUri(path);
            setAppWallpaper(uri);
            localStorage.setItem('soundstorm-bg-image', uri);

            // Auto-lower blur
            blurIntensity.value = 10;
            blurVal.textContent = '10px';
            localStorage.setItem('soundstorm-blur-intensity', '10');
            applyBlur(10);
        }
    });

    clearBgImageBtn.addEventListener('click', () => {
        setAppWallpaper(null);
        localStorage.removeItem('soundstorm-bg-image');
    });

    // Bass
    bassGain.addEventListener('input', (e) => {
        const db = parseInt(e.target.value);
        bassVal.textContent = (db >= 0 ? '+' : '') + db + ' dB';
        setBassGain(db);
        localStorage.setItem('soundstorm-bass', db);
    });

    // Treble
    trebleGain.addEventListener('input', (e) => {
        const db = parseInt(e.target.value);
        trebleVal.textContent = (db >= 0 ? '+' : '') + db + ' dB';
        setTrebleGain(db);
        localStorage.setItem('soundstorm-treble', db);
        syncPanel();
    });

    // ---- Reset Sound (in settings modal) ----
    resetSoundBtn.addEventListener('click', () => applyResetSound());

    // ---- Floating EQ Panel ----
    eqToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !eqPanel.classList.contains('hidden');
        if (isOpen) {
            eqPanel.classList.add('hidden');
            eqToggleBtn.classList.remove('active-mode');
        } else {
            syncPanel();
            eqPanel.classList.remove('hidden');
            eqToggleBtn.classList.add('active-mode');
        }
    });

    eqPanelClose.addEventListener('click', () => {
        eqPanel.classList.add('hidden');
        eqToggleBtn.classList.remove('active-mode');
    });

    document.addEventListener('click', (e) => {
        if (!eqPanel.classList.contains('hidden') &&
            !eqPanel.contains(e.target) &&
            e.target !== eqToggleBtn) {
            eqPanel.classList.add('hidden');
            eqToggleBtn.classList.remove('active-mode');
        }
    });
    eqPanel.addEventListener('click', (e) => e.stopPropagation());

    panelBassGain.addEventListener('input', (e) => {
        const db = parseInt(e.target.value);
        panelBassVal.textContent = (db >= 0 ? '+' : '') + db + ' dB';
        setBassGain(db);
        localStorage.setItem('soundstorm-bass', db);
        bassGain.value = db;
        bassVal.textContent = panelBassVal.textContent;
    });

    panelTrebleGain.addEventListener('input', (e) => {
        const db = parseInt(e.target.value);
        panelTrebleVal.textContent = (db >= 0 ? '+' : '') + db + ' dB';
        setTrebleGain(db);
        localStorage.setItem('soundstorm-treble', db);
        trebleGain.value = db;
        trebleVal.textContent = panelTrebleVal.textContent;
    });

    eqPanelReset.addEventListener('click', () => applyResetSound());

    // Reset
    resetSettingsBtn.addEventListener('click', () => {
        ['soundstorm-accent-color', 'soundstorm-bg-color', 'soundstorm-panel-color', 'soundstorm-glass-opacity', 'soundstorm-font', 'soundstorm-bg-image', 'soundstorm-blur-intensity', 'soundstorm-bass', 'soundstorm-treble'].forEach(k => localStorage.removeItem(k));

        document.documentElement.style.setProperty('--primary', '#06c650');
        document.documentElement.style.setProperty('--bg-base', '#042d01');
        updatePanelGlass('#033014', 13);
        setAppWallpaper('./assets/d_bg.jpg');
        applyBlur(13);
        document.body.style.fontFamily = "'Outfit', sans-serif";

        colorPicker.value = '#06c650';
        bgColorPicker.value = '#042d01';
        panelColorPicker.value = '#033014';
        glassOpacity.value = 13;
        opacityVal.textContent = '13%';
        blurIntensity.value = 13;
        blurVal.textContent = '13px';

        // Reset sound
        bassGain.value = 0;  bassVal.textContent = '0 dB';
        trebleGain.value = 0; trebleVal.textContent = '0 dB';
        setBassGain(0); setTrebleGain(0);
        localStorage.removeItem('soundstorm-bass');
        localStorage.removeItem('soundstorm-treble');
        syncPanel();
        applyFont("'Outfit', sans-serif");
        toast('Settings reset to defaults');
    });

    loadSettings();
}

function syncPanel() {
    const b = parseInt(bassGain.value);
    const t = parseInt(trebleGain.value);
    panelBassGain.value = b;
    panelBassVal.textContent = (b >= 0 ? '+' : '') + b + ' dB';
    panelTrebleGain.value = t;
    panelTrebleVal.textContent = (t >= 0 ? '+' : '') + t + ' dB';
}

function applyResetSound() {
    localStorage.removeItem('soundstorm-bass');
    localStorage.removeItem('soundstorm-treble');
    bassGain.value = 0;  bassVal.textContent = '0 dB';
    trebleGain.value = 0; trebleVal.textContent = '0 dB';
    setBassGain(0);
    setTrebleGain(0);
    syncPanel();
    toast('Sound reset to flat');
}

export function loadSettings() {
    const savedColor = localStorage.getItem('soundstorm-accent-color');
    if (savedColor) {
        document.documentElement.style.setProperty('--primary', savedColor);
        colorPicker.value = savedColor;
    }

    const savedBg = localStorage.getItem('soundstorm-bg-color');
    if (savedBg) {
        document.documentElement.style.setProperty('--bg-base', savedBg);
        bgColorPicker.value = savedBg;
    }

    const savedPanel = localStorage.getItem('soundstorm-panel-color');
    const savedOpacity = localStorage.getItem('soundstorm-glass-opacity') || '13';
    if (savedPanel) panelColorPicker.value = savedPanel;
    glassOpacity.value = savedOpacity;
    opacityVal.textContent = savedOpacity + '%';
    updatePanelGlass(savedPanel || '#033014', savedOpacity);

    const savedFont = localStorage.getItem('soundstorm-font') || "'Outfit', sans-serif";
    applyFont(savedFont);

    const savedBlur = localStorage.getItem('soundstorm-blur-intensity') || '13';
    blurIntensity.value = savedBlur;
    blurVal.textContent = savedBlur + 'px';
    applyBlur(savedBlur);

    const savedWallpaper = localStorage.getItem('soundstorm-bg-image');
    if (savedWallpaper) {
        setAppWallpaper(savedWallpaper);
    } else {
        // Set default background
        setAppWallpaper('./assets/d_bg.jpg');
    }

    // Load sound settings
    const savedBass = parseInt(localStorage.getItem('soundstorm-bass') || '0');
    bassGain.value = savedBass;
    bassVal.textContent = (savedBass >= 0 ? '+' : '') + savedBass + ' dB';

    const savedTreble = parseInt(localStorage.getItem('soundstorm-treble') || '0');
    trebleGain.value = savedTreble;
    trebleVal.textContent = (savedTreble >= 0 ? '+' : '') + savedTreble + ' dB';
    syncPanel();
}

export function hexToRgba(hex, alpha) {
    if (!hex || hex.length < 7) return 'rgba(0,0,0,0)';
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function updatePanelGlass(hex, pct) {
    const a = parseInt(pct) / 100;
    document.documentElement.style.setProperty('--panel-bg', hexToRgba(hex, a));
    document.documentElement.style.setProperty('--panel-dark', hexToRgba(hex, Math.min(1, a + 0.3)));
    document.documentElement.style.setProperty('--sidebar-bg', hexToRgba(hex, Math.min(1, a + 0.2)));
}

export function setAppWallpaper(uri) {
    state.currentWallpaperUri = uri || null;
    if (state.currentWallpaperUri) {
        bgBlur.style.backgroundImage = `url("${state.currentWallpaperUri}")`;
    } else if (!trackArt.classList.contains('hidden')) {
        bgBlur.style.backgroundImage = `url("${trackArt.src}")`;
    } else {
        bgBlur.style.backgroundImage = 'none';
    }
}

export function applyBlur(px) {
    const blurPx = parseInt(px);
    const brightness = Math.max(0.08, 0.7 - (blurPx / 150) * 0.62).toFixed(2);
    const scale = blurPx < 10 ? 1.0 : 1.08;
    bgBlur.style.filter = `blur(${blurPx}px) brightness(${brightness}) saturate(1.4)`;
    bgBlur.style.transform = `scale(${scale})`;
}

export function applyFont(val) {
    currentFontValue = val;
    document.body.style.fontFamily = val;
    localStorage.setItem('soundstorm-font', val);

    const items = Array.from(fontDropdownMenu.querySelectorAll('.custom-dropdown-item'));
    const matched = items.find(el => el.dataset.value === val);
    if (matched) fontDropdownLabel.textContent = matched.textContent;
    items.forEach(el => el.classList.toggle('selected', el.dataset.value === val));
}
