# Frak

[![Dependency Status](https://david-dm.org/vankasteelj/frak/status.svg)](https://david-dm.org/vankasteelj/frak)
[![devDependency Status](https://david-dm.org/vankasteelj/frak/dev-status.svg)](https://david-dm.org/vankasteelj/frak?type=dev)

**A frakingly good media center**

![frak](https://user-images.githubusercontent.com/12599850/44541156-62447d00-a709-11e8-8a83-81fd5807d8bd.png)

## Prerequisites
- A [trakt](https://trakt.tv/) account (you'll be prompted to create one or login)
- [MPV player](https://mpv.io/) for macOS (should be automatically installed on Windows/Linux)

## Features
- Fully synced with Trakt.tv (watchlist, up next to watch, currently watching, watched history)
- Search across Trakt database, watch trailers in-app, manage your lists & much more
- Automatic subtitles search & 1-click-download
- Multiple stream sources available: local video files, torrents, magnets and URLs
- Your local video library is automatically parsed and sorted
- Shared streams over the local network
- Based on the robust 'mpv' player
- "big picture" mode for TV & large screens
- Auto-launch and minimize to tray support
- Localization support
- Theming support
- Automatic update notification
- Compatible with Windows (7, 8, 10), OSX and major Linux distributions
- Hackable (written in NodeJS/HTML5/CSS3, open source, shipped with devtools)

[Download the latest Frak release!](https://github.com/vankasteelj/frak/releases).

## Build from sources
- Install dependencies, download binaries:

        npm install -g gulp-cli
        npm install
        gulp build

- Start live-development:

        gulp run
    
- CTRL+D to open devtools (debugger), CTRL+R to reload.

## Distribute
- Build packages and installers:

        gulp dist --platforms=all
        
        
## License
Copyright Jean van Kasteel - GNU GPL v3.0