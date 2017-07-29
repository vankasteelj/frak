# NWJS-JQUERY boilerplate app

Just a simple app boilerplate without framework for quick and dirty app building. Includes :

- notifications
- installer (windows/deb/tgz/macos tgz)
- localisation
- keyboard shortcuts

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