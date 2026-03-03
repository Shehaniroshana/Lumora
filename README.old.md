# ✦ SoundStorm

**SoundStorm** is a stunning, high-performance desktop MP3 player built with Electron and Vanilla JavaScript. It features a modern "Glassmorphism" aesthetic, real-time audio visualization, and a highly modular architecture designed for speed and scalability.

![SoundStorm UI](https://img.shields.io/badge/UI-Aesthetics-purple?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-40.6+-blue?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/Vanilla-JS-yellow?style=for-the-badge)

## ✨ Features

- **🌊 Premium Aesthetics**: Sleek dark mode with customizable glassmorphism effects, blur intensity, and accent colors.
- **🎨 Dynamic Wallpapers**: Set any image as your background with automatic adaptive blur and brightness.
- **📊 Real-time Visualizer**: Animated equalizer bars and background canvas visualization synchronized with your music.
- **📱 Fully Responsive**: Seamless transition between desktop and mobile-optimized layouts with a sliding navigation drawer.
- **📂 Smart Scanning**: Effortlessly scan local folders for music with automatic metadata extraction (Title, Artist, Album, Art).
- **❤️ Favorites & Playlists**: Create custom collections and mark your top tracks for quick access.
- **🔍 Intelligent Search**: Instant fuzzy searching across your entire music library.
- **🎧 Playback Control**: High-quality audio engine with shuffle, repeat modes, and context-aware queueing.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables), ES6+ Modules.
- **Backend**: [Electron](https://www.electronjs.org/) (Main & Preload scripts).
- **Metadata**: [music-metadata](https://github.com/borewit/music-metadata) for reading MP3 tags and album art.
- **Styling**: Pure CSS with advanced filters and flex/grid layouts.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shehaniroshana/SoundStorm.git
   cd SoundStorm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Launch the application**:
   ```bash
   npm start
   ```

## 📂 Project Structure

```text
SoundStorm/
├── main.js             # Electron main process (IPC handlers, Window management)
├── preload.js          # Secure bridge between Main and Renderer
├── index.html          # Main application structure
├── styles/
│   └── style.css       # Core design system and responsive styles
├── js/
│   ├── core/
│   │   ├── state.js    # Global state management & persistence
│   │   └── utils.js    # Shared utility functions (formatting, toast)
│   └── ui/
│       └── dom.js      # Centralized DOM element references
└── utils/
    ├── scanner.js      # Recursive file system scanning logic
    └── metadata.js     # Media tag parsing engine
```

## 📄 License

This project is licensed under the ISC License - see the `package.json` file for details.

---
*Created with ❤️ by Shehan Iroshana*
