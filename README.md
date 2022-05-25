# Frak

**A frakingly good media center**
![frak](https://user-images.githubusercontent.com/12599850/100279290-89ccc480-2f66-11eb-9281-ca575cfbfab9.png)

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
- "Big Picture" mode for TV & large screens
- Auto-launch and minimize to tray support
- Localization support
- Theming support
- Automatic update notification
- Compatible with Windows (7, 8, 10), OSX and major Linux distributions (even ARM, see [#115](https://github.com/vankasteelj/frak/issues/115))
- Hackable (written in NodeJS/HTML5/CSS3, open source, shipped with devtools)

[Download the latest Frak release!](https://github.com/vankasteelj/frak/releases)

## Build it yourself from the sources
- Download and install [NodeJS and npm](https://nodejs.org)

- Install dependencies, download binaries:

        npm install -g gulp-cli
        npm install
        gulp build

- Start live-development:

        gulp run
    
- CTRL+D to open devtools (debugger), CTRL+R to reload.

## Distribute a compiled package
- Build packages and installers:

        gulp dist --platforms=all
        
        
## License
Copyright Jean van Kasteel - GNU GPL v3.0