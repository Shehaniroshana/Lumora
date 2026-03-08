<div align="center">

# ✦ Lumora

**A Beautiful, Feature-Rich Desktop Music Player**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-40.6+-blue?logo=electron)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-lightgrey)](#-download)
[![Version](https://img.shields.io/badge/Version-1.0.0-green)](#)

*Lumora is a stunning, high-performance desktop media player built with Electron and modern web technologies. Featuring a gorgeous glassmorphism UI, powerful audio engine, video playback support, and extensive customization options.*

[Download](#-download) • [Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Build](#-building-from-source)

---

</div>

## 📸 Screenshots

<!-- Add your screenshots here -->
> *Coming soon - App screenshots showcasing the beautiful interface*

---

## ✨ Features

### 🎵 **Audio Experience**
- **High-Quality Playback** - Supports MP3, FLAC, WAV, OGG, and more
- **Built-in Equalizer** - Adjust Bass and Treble with real-time audio processing
- **Audio Visualizer** - Animated EQ bars synced to your music
- **Playback Controls** - Play, pause, skip, shuffle, and repeat modes
- **Gapless Playback** - Smooth transitions between tracks

### 🎨 **Stunning Interface**
- **Glassmorphism Design** - Modern, translucent glass panels with depth
- **Custom Themes** - Change accent colors, background colors, and panel transparency
- **Dynamic Wallpapers** - Set any image as your background with adaptive blur
- **Adjustable Blur & Opacity** - Fine-tune the glass effect to your preference
- **Multiple Font Options** - Outfit, Inter, Roboto Mono, Serif, or System Default
- **Dark Mode** - Easy on the eyes for extended listening sessions

### 📚 **Library Management**
- **Smart Library Scanner** - Automatically scan folders and extract metadata
- **Album Art Display** - Beautiful cover art extraction from MP3 tags
- **Search Functionality** - Instant search across your entire library
- **Favorites System** - Mark and organize your favorite tracks
- **Custom Playlists** - Create unlimited playlists and organize your music
- **Sorting Options** - Sort by title, artist, album, or recently added

### 🎬 **Video Playback**
- **Video Player** - Play MP4, MKV, WebM, and other video formats
- **Subtitle Support** - Load external SRT subtitle files
- **Quality Badge** - Automatic quality detection (HD/FHD/4K)
- **Video Navigation** - Browse and play videos from your library

### 🔧 **Advanced Features**
- **Persistent State** - Your settings, playlists, and favorites are saved automatically
- **Context Menu** - Right-click on tracks for quick actions
- **File Management** - Rename, delete, or reveal tracks in file explorer
- **Auto-Update System** - Get notified and install updates with one click
- **Folder Management** - Add/remove multiple music folders
- **Responsive Design** - Works great on different screen sizes

### ⚙️ **Settings & Customization**
- **Theme Customization** - Accent color, background color, panel color
- **Visual Effects** - Glass opacity (10-100%) and blur intensity (0-150px)
- **Sound Settings** - Bass boost/cut (-12 to +12 dB)
- **Sound Settings** - Treble boost/cut (-12 to +12 dB)
- **Font Selection** - Multiple professional fonts to choose from
- **Background Images** - Set custom wallpapers for your player
- **Reset Options** - Reset all settings or just sound to defaults

---

## 💾 Download

### Latest Release: v1.0.0

| Platform | Download | Auto-Update |
|----------|----------|-------------|
| 🪟 **Windows** | [Installer (NSIS)](../../releases) • [Portable](../../releases) | ✅ Yes |
| 🐧 **Linux** | [AppImage](../../releases) (recommended) | ✅ Yes |
| 🐧 **Linux** | [DEB Package](../../releases) | ❌ No |

👉 **[View All Releases](../../releases)**

> 💡 **Tip**: Use AppImage on Linux if you want automatic updates!

---

## 🚀 Installation

### For Users

#### Windows
1. Download the `.exe` installer from [Releases](../../releases)
2. Run the installer and follow the setup wizard
3. Launch Lumora from Start Menu or Desktop shortcut

#### Linux

**AppImage (Recommended for Auto-Updates):**
```bash
# Download the AppImage from releases
chmod +x Lumora-*.AppImage
./Lumora-*.AppImage
```
> ✅ **AppImage supports auto-updates!** Click "Check for Updates" in Settings to get new versions automatically.

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i Lumora-*.deb
sudo apt-get install -f  # Install dependencies
```
> ⚠️ **.deb packages do NOT support auto-updates.** You'll need to manually download and install new versions. Use AppImage if you want automatic updates!

---

## 🎯 Usage

### Getting Started
1. **Add Music Folders**
   - Click "Add Folder" button in the sidebar
   - Select folders containing your music
   - Lumora will automatically scan and import your tracks

2. **Play Music**
   - Click any track to start playing
   - Use playback controls at the bottom
   - Right-click tracks for more options

3. **Create Playlists**
   - Click the "+" icon in the Playlists section
   - Give your playlist a name
   - Add songs from your library

4. **Customize Your Experience**
   - Click the Settings icon in the sidebar
   - Adjust colors, blur, fonts, and sound
   - Set a custom background image

### Keyboard Shortcuts
- **Space** - Play/Pause
- **Right Arrow** - Next track
- **Left Arrow** - Previous track
- **Ctrl+F** - Focus search bar

---

## 🛠️ Technology Stack

**Core Technologies:**
- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- HTML5, CSS3, Vanilla JavaScript - Modern web technologies
- ES6+ Modules - Modular architecture

**Key Libraries:**
- [music-metadata](https://github.com/borewit/music-metadata) - Audio metadata extraction
- [electron-store](https://github.com/sindresorhus/electron-store) - Data persistence
- [electron-updater](https://github.com/electron-userland/electron-builder) - Auto-update functionality
- [mime-types](https://github.com/jshttp/mime-types) - File type detection

---

## 🔨 Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Shehaniroshana/Lumora.git
cd Lumora

# Install dependencies
npm install

# Run in development mode
npm start
```

### Building Installers

```bash
# Build for current platform
npm run build

# Build for Linux only
npm run build:linux

# Build for Windows only
npm run build:win

# Build for all platforms
npm run build:all
```

Build outputs will be in the `dist/` folder.

---

## 📂 Project Structure

```
Lumora/
├── main.js                      # Electron main process
├── preload.js                   # Context bridge (security)
├── renderer.js                  # Main renderer logic
├── index.html                   # Application UI
├── package.json                 # Dependencies & metadata
│
├── assets/                      # Icons & images
│   ├── new.png                  # App icon
│   └── d_bg.jpg                 # Default background
│
├── styles/
│   └── style.css                # All styling & themes
│
├── js/
│   ├── core/
│   │   ├── audio.js             # Audio engine & EQ
│   │   ├── state.js             # Global state management
│   │   └── utils.js             # Utility functions
│   │
│   └── ui/
│       ├── dom.js               # DOM element references
│       ├── player-enhancements.js # Player features
│       └── settings.js          # Settings & themes
│
├── utils/
│   ├── scanner.js               # File system scanning
│   └── metadata.js              # Metadata parsing
│
└── .github/
    └── workflows/
        └── release.yml          # Auto-build & release
```

---

## 📋 Changelog

### v1.0.0 - Initial Release (March 2026)

**🎉 Initial Features:**
- ✅ Audio playback with support for multiple formats
- ✅ Video playback with subtitle support
- ✅ Library management with folder scanning
- ✅ Favorites and custom playlists
- ✅ Real-time search functionality
- ✅ Built-in equalizer (Bass & Treble)
- ✅ Glassmorphism UI with full customization
- ✅ Theme system (colors, blur, opacity)
- ✅ Custom background wallpapers
- ✅ Persistent state management
- ✅ Context menu for track operations
- ✅ File management (rename, delete, reveal)
- ✅ Auto-update system
- ✅ Responsive design
- ✅ Audio visualizer
- ✅ Multiple font options
- ✅ Sorting and filtering

---

## 📜 License & Terms

### License

**MIT License**

Copyright (c) 2026 Shehan Iroshana

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Terms of Use

1. **Personal Use**: Lumora is free for personal, non-commercial use.
2. **Modifications**: You may modify the source code for personal use.
3. **Distribution**: If you distribute modified versions, you must:
   - Include this license
   - Clearly state your changes
   - Credit the original author
4. **Music Files**: You are responsible for having the rights to any music files you play in Lumora. This software does not provide or distribute any copyrighted content.
5. **No Warranty**: This software is provided "as is" without warranty of any kind.

### Privacy

- **No Data Collection**: Lumora does not collect, store, or transmit any personal data.
- **Local Storage**: All settings and playlists are stored locally on your device.
- **No Analytics**: No usage tracking or analytics are implemented.
- **No Accounts**: No login or account creation required.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Bug Reports
Found a bug? Please [open an issue](../../issues) with:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)
- Your OS and app version

---

## ❓ FAQ

**Q: What audio formats are supported?**  
A: MP3, FLAC, WAV, OGG, AAC, M4A, OPUS, and more.

**Q: Does it work offline?**  
A: Yes! Lumora is completely offline and plays local files.

**Q: Can I import my playlists from Spotify/Apple Music?**  
A: Not currently, but this is planned for future releases.

**Q: Is my music collection uploaded anywhere?**  
A: No. Everything stays on your computer.

**Q: How do I update the app?**  
A: 
- **Windows (.exe)** and **Linux (AppImage)**: Go to Settings → Check for Updates. The app will download and install updates automatically.
- **Linux (.deb)**: Auto-updates are not supported. Download the latest .deb from [Releases](../../releases) and install it manually, or switch to AppImage for automatic updates.

---

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Music metadata parsing by [music-metadata](https://github.com/borewit/music-metadata)
- Icons and design inspired by modern glassmorphism trends
- Special thanks to all open-source contributors

---

## 📞 Support

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Author**: Shehan Iroshana
- **Email**: shehan.iroshan.dev@gmail.com

---

<div align="center">

**⭐ If you like Lumora, give it a star on GitHub! ⭐**

Made with ❤️ by [Shehan Iroshana](https://github.com/Shehaniroshana)

</div>
