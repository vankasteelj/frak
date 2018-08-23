# Frak

A frakingly good media center

![frak](https://user-images.githubusercontent.com/12599850/44541156-62447d00-a709-11e8-8a83-81fd5807d8bd.png)

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