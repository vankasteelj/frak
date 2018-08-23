# Frak

A frakingly good media center

![frak](https://user-images.githubusercontent.com/12599850/34535184-802b85ec-f0c1-11e7-8731-0d52c2a7fb59.png)

## Prerequisites
- A [trakt](https://trakt.tv/) account (you'll be prompted to create one or login)
- [MPV player](https://mpv.io/) for linux/macOS (should be automatically installed on Windows)

## Set up
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