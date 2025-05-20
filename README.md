# Frak

**A frakingly good media center**
![frak](https://github.com/user-attachments/assets/55880b7c-a32a-4cdb-b514-8a228b7a0d74)

## Prerequisites
- A [trakt](https://trakt.tv/) account (you'll be prompted to create one or login)

## Features
- Fully synced with Trakt.tv (watchlist, up next to watch, currently watching, watched history) with multi-account support
- Search across Trakt database, watch trailers in-app, manage your watchlist (and custom lists) & much more
- Automatic subtitles search & 1-click-download
- Multiple stream sources available: local video files, torrents, magnets and URLs
- Your local video library is automatically parsed and sorted
- Shared streams over the local network
- Based on the robust 'mpv' player
- "Big Picture" mode for TV & large screens
- Stats and fun facts based on your watched history
- Auto-launch and minimize to tray support
- Localization support
- Theming support
- Automatic update notification
- Developed for Windows. OSX and Linux (even ARM, see [#115](https://github.com/vankasteelj/frak/issues/115)) might work if you know what you're doing.
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

        gulp dist
        
        
## License
Copyright Jean van Kasteel - GNU GPL v3.0 - developed since july 2017
