# Changelog

All notable changes to Lumora will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-08

### ✨ New Features

**Multi-Select & Bulk Actions:**
- Right-click "Select" and "Select All" options in context menu
- Bulk action context menu when items are selected (Play All, Add to Favorites, Add to Playlist, Delete)
- "Add to Playlist" button on selection toolbars for library & favorites
- Smarter context menu that switches between single-item and bulk modes

**Advanced Sorting & Play-by-Order:**
- New sort options: Genre, File Name, Random
- Ascending/Descending direction toggle for all sort options
- Next/Previous now follows the visible sort order
- Sort preferences persist across sessions

**Weekly Listening Report:**
- Automatic play history tracking for every song played
- Weekly report auto-shows after 7 days with listening data
- Summary cards: Songs Played, Listening Time, Unique Songs, Artists
- Top 5 Most Played Songs, Top Artists, Top Genres rankings
- 7-day daily activity bar chart
- Play history auto-cleanup (6 months retention)

---

## [1.0.0] - 2026-03-03

### 🎉 Initial Release

**Audio Features:**
- High-quality audio playback engine
- Support for MP3, FLAC, WAV, OGG, AAC, M4A, OPUS formats
- Built-in equalizer with Bass and Treble controls (-12 to +12 dB)
- Real-time audio visualizer with animated EQ bars
- Shuffle and repeat playback modes
- Smooth gapless playback
- Volume control with mute functionality

**Video Features:**
- Video playback support (MP4, MKV, WebM)
- External subtitle file support (.srt)
- Automatic quality detection (HD/FHD/4K)
- Video library management
- Next/Previous video navigation

**Library Management:**
- Smart folder scanning with metadata extraction
- Automatic album art extraction from MP3 tags
- Multi-folder support
- Real-time search across library
- Sort by title, artist, album, or date added
- Persistent library state

**Playlists & Favorites:**
- Unlimited custom playlist creation
- Favorites system for quick access
- Add/remove songs from playlists
- Playlist rename and delete
- Persistent playlist storage
- Song picker with search

**User Interface:**
- Beautiful glassmorphism design
- Customizable accent colors
- Adjustable background colors
- Configurable panel transparency (10-100%)
- Variable blur intensity (0-150px)
- Custom background wallpapers
- Multiple font options (Outfit, Inter, Roboto Mono, Serif, System)
- Responsive design for different screen sizes
- Dark mode optimized
- Mobile-friendly sidebar

**Advanced Features:**
- Auto-update system with manual check
- Context menu for track operations
- File operations (rename, delete, reveal in folder)
- Persistent settings using electron-store
- Keyboard shortcuts support
- Toast notifications
- In-app changelog display

**Technical:**
- Built with Electron 40.6+
- Modular ES6+ architecture
- Secure IPC communication
- Cross-platform support (Windows, Linux)
- GitHub Actions CI/CD for releases

### Added
- Initial project setup
- Complete UI implementation
- Audio playback engine
- Video playback functionality
- Settings panel with full customization
- Library scanner and metadata parser
- Playlist management system
- Favorites system
- Search functionality
- Context menu system
- Auto-update functionality
- GitHub Actions workflow

---

## Future Releases

### Planned Features
- [ ] macOS support
- [ ] Cloud sync for playlists
- [ ] Last.fm scrobbling
- [ ] Lyrics display
- [ ] Mini-player mode
- [ ] Spotify/Apple Music playlist import
- [ ] Advanced equalizer with presets
- [ ] Sleep timer
- [ ] Discord Rich Presence
- [ ] Cross-fade between tracks
- [ ] Keyboard media key support
- [ ] System tray integration
- [ ] Music recommendations

---

[1.0.0]: https://github.com/Shehaniroshana/Lumora/releases/tag/v1.0.0
